"use strict";

/*
 * HallazGo — Registro de sesiones de seguridad.
 *
 * Este módulo:
 * - identifica la sesión de Supabase;
 * - crea un identificador local del dispositivo;
 * - envía señales técnicas al servidor;
 * - guarda únicamente el resultado de seguridad;
 * - cierra la sesión si Supabase la bloquea.
 */

window.HallazgoSecuritySession =
  (() => {
    const DEVICE_KEY =
      "hallazgo_device_id_v1";

    const SECURITY_STATE_KEY =
      "hallazgo_security_session_state";

    let activeRequest = null;

    function createRandomId() {
      if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
          "function"
      ) {
        return window.crypto.randomUUID();
      }

      return [
        Date.now().toString(36),
        Math.random()
          .toString(36)
          .slice(2),
        Math.random()
          .toString(36)
          .slice(2)
      ].join("-");
    }

    function getOrCreateDeviceId() {
      const savedId =
        localStorage.getItem(
          DEVICE_KEY
        );

      if (
        savedId &&
        savedId.length >= 8 &&
        savedId.length <= 200
      ) {
        return savedId;
      }

      const newId =
        createRandomId();

      localStorage.setItem(
        DEVICE_KEY,
        newId
      );

      return newId;
    }

    function getTimezone() {
      try {
        return (
          Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone ||
          "desconocida"
        );
      } catch (error) {
        console.warn(
          "No se pudo obtener la zona horaria:",
          error
        );

        return "desconocida";
      }
    }

    function buildBrowserSignature() {
      const screenData =
        window.screen
          ? [
              window.screen.width,
              window.screen.height,
              window.screen.colorDepth
            ].join("x")
          : "sin-pantalla";

      const languages =
        Array.isArray(
          navigator.languages
        )
          ? navigator.languages.join(",")
          : navigator.language || "";

      return [
        navigator.userAgent || "",
        navigator.platform || "",
        navigator.language || "",
        languages,
        screenData,
        window.devicePixelRatio || 1,
        navigator.hardwareConcurrency || 0,
        getTimezone()
      ].join("|");
    }

    function saveSecurityState(
      securitySession
    ) {
      const state = {
        id:
          securitySession?.id || null,

        authSessionId:
          securitySession
            ?.auth_session_id || null,

        status:
          securitySession?.estado ||
          "desconocida",

        riskScore:
          Number(
            securitySession
              ?.puntaje_riesgo || 0
          ),

        authenticationLevel:
          securitySession
            ?.nivel_autenticacion ||
          "aal1",

        lastActivity:
          securitySession
            ?.ultima_actividad ||
          null
      };

      sessionStorage.setItem(
        SECURITY_STATE_KEY,
        JSON.stringify(state)
      );

      return state;
    }

    function getSecurityState() {
      try {
        const saved =
          sessionStorage.getItem(
            SECURITY_STATE_KEY
          );

        return saved
          ? JSON.parse(saved)
          : null;
      } catch (error) {
        console.warn(
          "No se pudo leer el estado de seguridad:",
          error
        );

        return null;
      }
    }

    function clearSecurityState() {
      sessionStorage.removeItem(
        SECURITY_STATE_KEY
      );
    }

    async function registerInternal() {
      const database =
        window.HallazgoDB;

      if (!database) {
        return {
          ok: false,
          code: "NO_DATABASE",
          error: new Error(
            "No se pudo conectar con Supabase."
          )
        };
      }

      const {
        data: sessionData,
        error: sessionError
      } = await database.auth
        .getSession();

      if (sessionError) {
        return {
          ok: false,
          code: "SESSION_ERROR",
          error: sessionError
        };
      }

      if (!sessionData.session) {
        clearSecurityState();

        return {
          ok: false,
          code: "NO_SESSION",
          error: null
        };
      }

      const deviceId =
        getOrCreateDeviceId();

      const browserSignature =
        buildBrowserSignature();

      const platform =
        String(
          navigator.platform ||
          "desconocida"
        ).slice(
          0,
          100
        );

      const language =
        String(
          navigator.language ||
          "desconocido"
        ).slice(
          0,
          40
        );

      const timezone =
        getTimezone().slice(
          0,
          100
        );

      const {
        data,
        error
      } = await database.rpc(
        "registrar_sesion_seguridad",
        {
          dispositivo_id:
            deviceId,

          firma_navegador:
            browserSignature,

          plataforma_cliente:
            platform,

          idioma_cliente:
            language,

          zona_horaria_cliente:
            timezone
        }
      );

      if (error) {
        console.error(
          "No se pudo registrar la sesión de seguridad:",
          error
        );

        return {
          ok: false,
          code: "RPC_ERROR",
          error
        };
      }

      const securitySession =
        Array.isArray(data)
          ? data[0]
          : data;

      if (!securitySession) {
        return {
          ok: false,
          code: "EMPTY_RESPONSE",
          error: new Error(
            "Supabase no devolvió el estado de seguridad."
          )
        };
      }

      const state =
        saveSecurityState(
          securitySession
        );

      if (
        securitySession.estado ===
        "bloqueada"
      ) {
        clearSecurityState();

        localStorage.removeItem(
          "hallazgo_current_user"
        );

        await database.auth
          .signOut();

        return {
          ok: false,
          code: "BLOCKED",
          session:
            securitySession,
          state,
          error: new Error(
            "La sesión fue bloqueada por seguridad."
          )
        };
      }

      return {
        ok: true,
        code: "REGISTERED",
        session:
          securitySession,
        state,
        error: null
      };
    }

    function register() {
      if (activeRequest) {
        return activeRequest;
      }

      activeRequest =
        registerInternal()
          .catch((error) => {
            console.error(
              "Error inesperado registrando la sesión:",
              error
            );

            return {
              ok: false,
              code: "UNEXPECTED_ERROR",
              error
            };
          })
          .finally(() => {
            activeRequest = null;
          });

      return activeRequest;
    }

    function initializeAutomaticRegistration() {
      const database =
        window.HallazgoDB;

      if (!database) {
        return;
      }

      database.auth.onAuthStateChange(
        (event) => {
          if (
            event === "SIGNED_OUT"
          ) {
            clearSecurityState();
            return;
          }

          if (
            event === "SIGNED_IN" ||
            event ===
              "TOKEN_REFRESHED"
          ) {
            window.setTimeout(
              () => {
                register();
              },
              0
            );
          }
        }
      );

      register().then(
        (result) => {
          if (
            !result.ok &&
            result.code !==
              "NO_SESSION"
          ) {
            console.warn(
              "La sesión no pudo registrarse automáticamente:",
              result
            );
          }
        }
      );
    }

    if (
      document.readyState ===
      "loading"
    ) {
      document.addEventListener(
        "DOMContentLoaded",
        initializeAutomaticRegistration,
        {
          once: true
        }
      );
    } else {
      initializeAutomaticRegistration();
    }

    return {
      register,
      getState:
        getSecurityState,
      clear:
        clearSecurityState
    };
  })();