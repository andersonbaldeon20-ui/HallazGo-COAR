"use strict";

(() => {
  const page =
    document.querySelector(
      "[data-mfa-page]"
    );

  if (!(page instanceof HTMLElement)) {
    return;
  }

  const AFTER_MFA_KEY =
    "hallazgo_after_mfa";

  const PENDING_USER_KEY =
    "hallazgo_pending_mfa_user";

  const statusElement =
    page.querySelector(
      "[data-mfa-status]"
    );

  const enrollmentSection =
    page.querySelector(
      "[data-phone-enrollment]"
    );

  const challengeSection =
    page.querySelector(
      "[data-phone-challenge]"
    );

  const successSection =
    page.querySelector(
      "[data-mfa-success]"
    );

  const enrollmentForm =
    page.querySelector(
      "[data-phone-enrollment-form]"
    );

  const codeForm =
    page.querySelector(
      "[data-phone-code-form]"
    );

  const enrollmentFeedback =
    page.querySelector(
      "[data-phone-enrollment-feedback]"
    );

  const codeFeedback =
    page.querySelector(
      "[data-phone-code-feedback]"
    );

  const phoneDestination =
    page.querySelector(
      "[data-phone-destination]"
    );

  const resendButton =
    page.querySelector(
      "[data-resend-phone-code]"
    );

  let currentFactorId = null;
  let currentChallengeId = null;
  let currentPhone = "";
  let resendTimerId = null;
  let resendSeconds = 0;

  function setStatus(
    message,
    isError = false
  ) {
    if (
      !(statusElement instanceof HTMLElement)
    ) {
      return;
    }

    statusElement.hidden = false;
    statusElement.textContent =
      message;

    statusElement.classList.toggle(
      "is-error",
      isError
    );
  }

  function setFeedback(
    element,
    message,
    isError = false
  ) {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.textContent =
      message;

    element.classList.toggle(
      "is-error",
      isError
    );
  }

  function setVisible(
    section,
    visible
  ) {
    if (!(section instanceof HTMLElement)) {
      return;
    }

    section.hidden =
      !visible;
  }

  function hideSections() {
    setVisible(
      enrollmentSection,
      false
    );

    setVisible(
      challengeSection,
      false
    );

    setVisible(
      successSection,
      false
    );
  }

  function normalizePhone(
    value
  ) {
    let phone =
      String(value || "")
        .trim()
        .replace(
          /[\s().-]/g,
          ""
        );

    if (
      /^9\d{8}$/.test(phone)
    ) {
      return `+51${phone}`;
    }

    if (
      /^51\d{9}$/.test(phone)
    ) {
      return `+${phone}`;
    }

    if (
      /^\+[1-9]\d{7,14}$/.test(
        phone
      )
    ) {
      return phone;
    }

    throw new Error(
      "Ingresa un número celular válido. Para Perú usa 987654321 o +51987654321."
    );
  }

  function maskPhone(
    value
  ) {
    const digits =
      String(value || "")
        .replace(
          /\D/g,
          ""
        );

    if (digits.length < 4) {
      return "celular registrado";
    }

    return (
      `+${"*".repeat(
        Math.max(
          digits.length - 4,
          4
        )
      )}${digits.slice(-4)}`
    );
  }

  async function getProfile(
    database,
    userId
  ) {
    const {
      data,
      error
    } = await database
      .from("perfiles")
      .select(`
        id,
        rol,
        estado,
        cuenta_institucional_verificada
      `)
      .eq(
        "id",
        userId
      )
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function registerSecuritySession() {
    if (
      !window.HallazgoSecuritySession
    ) {
      throw new Error(
        "No se cargó el módulo de seguridad."
      );
    }

    const result =
      await window
        .HallazgoSecuritySession
        .register();

    if (!result.ok) {
      throw (
        result.error ||
        new Error(
          "No se pudo registrar la sesión de seguridad."
        )
      );
    }

    return result.session;
  }

  function restorePendingUser() {
    try {
      const saved =
        sessionStorage.getItem(
          PENDING_USER_KEY
        );

      if (!saved) {
        return;
      }

      const parsed =
        JSON.parse(saved);

      const authUser =
        parsed?.authUser;

      const profile =
        parsed?.profile;

      if (
        !authUser ||
        !profile
      ) {
        sessionStorage.removeItem(
          PENDING_USER_KEY
        );

        return;
      }

      const roleLabels = {
        person:
          "Persona",

        student:
          "Estudiante COAR",

        staff:
          "Personal autorizado",

        admin:
          "Administrador"
      };

      const currentUser = {
        userId:
          profile.id ||
          authUser.id,

        email:
          profile.correo ||
          authUser.email ||
          "",

        firstName:
          profile.nombres ||
          "",

        lastName:
          profile.apellidos ||
          "",

        role:
          profile.rol,

        roleLabel:
          roleLabels[
            profile.rol
          ] ||
          profile.rol,

        status:
          profile.estado,

        userCode:
          profile.codigo_usuario,

        ageAtRegistration:
          profile
            .edad_al_registrarse,

        minorAtRegistration:
          profile
            .era_menor_al_registrarse,

        protectionLevel:
          profile
            .nivel_proteccion,

        requiresSupervision:
          profile
            .requiere_supervision,

        institutionalVerified:
          profile
            .cuenta_institucional_verificada,

        authProvider:
          "supabase"
      };

      localStorage.setItem(
        "hallazgo_current_user",
        JSON.stringify(
          currentUser
        )
      );

      sessionStorage.removeItem(
        PENDING_USER_KEY
      );
    } catch (error) {
      console.error(
        "No se pudo recuperar el perfil:",
        error
      );
    }
  }

  function finishVerification() {
    hideSections();

    setVisible(
      successSection,
      true
    );

    setStatus(
      "Verificación por celular completada correctamente."
    );

    restorePendingUser();

    const destination =
      localStorage.getItem(
        AFTER_MFA_KEY
      ) ||
      localStorage.getItem(
        "hallazgo_after_login"
      ) ||
      "reportar-objeto.html";

    localStorage.removeItem(
      AFTER_MFA_KEY
    );

    localStorage.removeItem(
      "hallazgo_after_login"
    );

    window.setTimeout(
      () => {
        window.location.href =
          destination;
      },
      900
    );
  }

  async function createChallenge(
    database
  ) {
    if (!currentFactorId) {
      throw new Error(
        "No se encontró el factor telefónico."
      );
    }

    const {
      data,
      error
    } = await database.auth.mfa
      .challenge({
        factorId:
          currentFactorId
      });

    if (error) {
      throw error;
    }

    if (!data?.id) {
      throw new Error(
        "No se pudo generar el código SMS."
      );
    }

    currentChallengeId =
      data.id;

    if (
      phoneDestination instanceof
      HTMLElement
    ) {
      phoneDestination.textContent =
        maskPhone(
          currentPhone
        );
    }

    hideSections();

    setVisible(
      challengeSection,
      true
    );

    setStatus(
      "Código enviado al celular registrado."
    );

    startResendCountdown();

    const codeInput =
      codeForm?.querySelector(
        'input[name="code"]'
      );

    if (
      codeInput instanceof
      HTMLInputElement
    ) {
      codeInput.focus();
    }
  }

  async function enrollPhone(
    database,
    phone
  ) {
    const {
      data,
      error
    } = await database.auth.mfa
      .enroll({
        factorType:
          "phone",

        friendlyName:
          "HallazGo celular",

        phone
      });

    if (error) {
      throw error;
    }

    if (!data?.id) {
      throw new Error(
        "Supabase no devolvió el factor telefónico."
      );
    }

    currentFactorId =
      data.id;

    currentPhone =
      data.phone ||
      phone;

    await createChallenge(
      database
    );
  }

  async function verifyCode(
    database,
    code
  ) {
    if (
      !currentFactorId ||
      !currentChallengeId
    ) {
      throw new Error(
        "No hay un desafío telefónico activo."
      );
    }

    const {
      data,
      error
    } = await database.auth.mfa
      .verify({
        factorId:
          currentFactorId,

        challengeId:
          currentChallengeId,

        code
      });

    if (error) {
      throw error;
    }

    return data;
  }

  function updateResendButton() {
    if (
      !(resendButton instanceof
        HTMLButtonElement)
    ) {
      return;
    }

    if (resendSeconds > 0) {
      resendButton.disabled =
        true;

      resendButton.textContent =
        `Reenviar en ${resendSeconds}s`;

      return;
    }

    resendButton.disabled =
      false;

    resendButton.textContent =
      "Reenviar código";
  }

  function startResendCountdown(
    seconds = 60
  ) {
    window.clearInterval(
      resendTimerId
    );

    resendSeconds =
      seconds;

    updateResendButton();

    resendTimerId =
      window.setInterval(
        () => {
          resendSeconds -= 1;

          updateResendButton();

          if (
            resendSeconds <= 0
          ) {
            window.clearInterval(
              resendTimerId
            );

            resendTimerId =
              null;
          }
        },
        1000
      );
  }

  async function initialize() {
    const database =
      window.HallazgoDB;

    if (!database) {
      setStatus(
        "No se pudo conectar con Supabase.",
        true
      );

      return;
    }

    try {
      const {
        data: userData,
        error: userError
      } = await database.auth
        .getUser();

      if (
        userError ||
        !userData.user
      ) {
        window.location.href =
          "seleccionar-rol.html";

        return;
      }

      const profile =
        await getProfile(
          database,
          userData.user.id
        );

      if (
        profile.estado !==
        "activo"
      ) {
        await database.auth
          .signOut();

        throw new Error(
          "La cuenta está suspendida o bloqueada."
        );
      }

      if (
        ["staff", "admin"].includes(
          profile.rol
        ) &&
        profile
          .cuenta_institucional_verificada !==
          true
      ) {
        await database.auth
          .signOut();

        throw new Error(
          "La cuenta institucional no está verificada."
        );
      }

      const {
        data: factorsData,
        error: factorsError
      } = await database.auth.mfa
        .listFactors();

      if (factorsError) {
        throw factorsError;
      }

      const phoneFactors =
        Array.isArray(
          factorsData?.phone
        )
          ? factorsData.phone
          : [];

      const verifiedPhoneFactor =
        phoneFactors.find(
          (factor) =>
            factor.status ===
            "verified"
        );

      /*
       * Todo usuario debe tener un teléfono
       * verificado para continuar.
       */

      if (!verifiedPhoneFactor) {
        hideSections();

        setVisible(
          enrollmentSection,
          true
        );

        setStatus(
          "Registra un celular para proteger todos tus inicios de sesión."
        );

        return;
      }

      currentFactorId =
        verifiedPhoneFactor.id;

      currentPhone =
        verifiedPhoneFactor.phone ||
        "";

      const {
        data: assuranceData,
        error: assuranceError
      } = await database.auth.mfa
        .getAuthenticatorAssuranceLevel();

      if (assuranceError) {
        throw assuranceError;
      }

      if (
        assuranceData
          ?.currentLevel ===
        "aal2"
      ) {
        await registerSecuritySession();

        finishVerification();

        return;
      }

      /*
       * En cada nuevo login convencional,
       * genera un desafío SMS.
       */

      await createChallenge(
        database
      );
    } catch (error) {
      console.error(
        "Error en MFA telefónico:",
        error
      );

      hideSections();

      setStatus(
        error?.message ||
        "No se pudo iniciar la verificación por celular.",
        true
      );
    }
  }

  enrollmentForm?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (
        !(enrollmentForm instanceof
          HTMLFormElement)
      ) {
        return;
      }

      if (
        !enrollmentForm.checkValidity()
      ) {
        enrollmentForm.reportValidity();
        return;
      }

      const database =
        window.HallazgoDB;

      const formData =
        new FormData(
          enrollmentForm
        );

      const button =
        enrollmentForm.querySelector(
          'button[type="submit"]'
        );

      try {
        const phone =
          normalizePhone(
            formData.get(
              "phone"
            )
          );

        if (
          button instanceof
          HTMLButtonElement
        ) {
          button.disabled =
            true;

          button.textContent =
            "Enviando...";
        }

        setFeedback(
          enrollmentFeedback,
          "Registrando celular y generando código..."
        );

        await enrollPhone(
          database,
          phone
        );

        setFeedback(
          enrollmentFeedback,
          ""
        );
      } catch (error) {
        console.error(
          "No se pudo registrar el celular:",
          error
        );

        setFeedback(
          enrollmentFeedback,
          error?.message ||
          "No se pudo registrar el celular.",
          true
        );
      } finally {
        if (
          button instanceof
          HTMLButtonElement
        ) {
          button.disabled =
            false;

          button.textContent =
            "Enviar código por SMS";
        }
      }
    }
  );

  codeForm?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (
        !(codeForm instanceof
          HTMLFormElement)
      ) {
        return;
      }

      if (!codeForm.checkValidity()) {
        codeForm.reportValidity();
        return;
      }

      const database =
        window.HallazgoDB;

      const formData =
        new FormData(
          codeForm
        );

      const code =
        String(
          formData.get("code") ||
          ""
        )
          .replace(
            /\D/g,
            ""
          )
          .trim();

      const button =
        codeForm.querySelector(
          'button[type="submit"]'
        );

      try {
        if (
          button instanceof
          HTMLButtonElement
        ) {
          button.disabled =
            true;

          button.textContent =
            "Verificando...";
        }

        setFeedback(
          codeFeedback,
          "Comprobando código..."
        );

        await verifyCode(
          database,
          code
        );

        await registerSecuritySession();

        setFeedback(
          codeFeedback,
          "Celular verificado correctamente."
        );

        finishVerification();
      } catch (error) {
        console.error(
          "Código SMS incorrecto:",
          error
        );

        setFeedback(
          codeFeedback,
          error?.message ||
          "El código es incorrecto o ya expiró.",
          true
        );
      } finally {
        if (
          button instanceof
          HTMLButtonElement
        ) {
          button.disabled =
            false;

          button.textContent =
            "Verificar y continuar";
        }
      }
    }
  );

  resendButton?.addEventListener(
    "click",
    async () => {
      const database =
        window.HallazgoDB;

      if (
        !database ||
        resendSeconds > 0
      ) {
        return;
      }

      try {
        setFeedback(
          codeFeedback,
          "Enviando un nuevo código..."
        );

        await createChallenge(
          database
        );

        setFeedback(
          codeFeedback,
          "Nuevo código enviado."
        );
      } catch (error) {
        setFeedback(
          codeFeedback,
          error?.message ||
          "No se pudo reenviar el código.",
          true
        );
      }
    }
  );

  window.addEventListener(
    "beforeunload",
    () => {
      window.clearInterval(
        resendTimerId
      );
    }
  );

  initialize();
})();
