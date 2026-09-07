"use strict";

/*
 * HallazGo — Registro e inicio de sesión con Supabase Auth.
 * Incluye fecha de nacimiento, edad al registrarse
 * y registro de la sesión de seguridad.
 */

window.HallazgoAuthV2 = true;

(() => {
  const CURRENT_USER_KEY = "hallazgo_current_user";
  const AFTER_LOGIN_KEY = "hallazgo_after_login";

  const ROLE_CONFIG = {
    person: {
      label: "Persona",
      title: "Acceso para persona",
      description:
        "Cuenta externa al COAR. El acceso será limitado y no tendrá chat directo con estudiantes.",
      message:
        "Seleccionaste: Persona. Usa tu correo personal para continuar."
    },

    student: {
      label: "Estudiante COAR",
      title: "Acceso para estudiante",
      description:
        "Cuenta para estudiantes de la institución. Permite reportar, buscar y recuperar objetos con protección reforzada.",
      message:
        "Seleccionaste: Estudiante COAR. Usa tu correo institucional para continuar."
    },

    staff: {
      label: "Personal autorizado",
      title: "Acceso para personal autorizado",
      description:
        "Cuenta para personal de apoyo operativo. El correo debe estar autorizado por la institución.",
      message:
        "Seleccionaste: Personal autorizado. El servidor verificará tu correo."
    },

    admin: {
      label: "Administrador",
      title: "Acceso administrativo",
      description:
        "Acceso exclusivo para administradores autorizados de HallazGo.",
      message:
        "Seleccionaste: Administrador. Este acceso requiere autorización previa."
    }
  };

  function normalizeEmail(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }

  function validateBirthDate(value) {
    const birthDate =
      String(value || "").trim();

    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        birthDate
      );

    if (!match) {
      return {
        valid: false,
        age: null,
        message:
          "Selecciona una fecha de nacimiento válida."
      };
    }

    const year =
      Number(match[1]);

    const month =
      Number(match[2]);

    const day =
      Number(match[3]);

    const parsedDate =
      new Date(
        year,
        month - 1,
        day
      );

    const isRealDate =
      parsedDate.getFullYear() === year &&
      parsedDate.getMonth() === month - 1 &&
      parsedDate.getDate() === day;

    if (!isRealDate) {
      return {
        valid: false,
        age: null,
        message:
          "La fecha de nacimiento no es válida."
      };
    }

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    if (parsedDate > today) {
      return {
        valid: false,
        age: null,
        message:
          "La fecha de nacimiento no puede estar en el futuro."
      };
    }

    let age =
      today.getFullYear() -
      parsedDate.getFullYear();

    const birthdayNotReached =
      today.getMonth() <
        parsedDate.getMonth() ||
      (
        today.getMonth() ===
          parsedDate.getMonth() &&
        today.getDate() <
          parsedDate.getDate()
      );

    if (birthdayNotReached) {
      age -= 1;
    }

    if (
      age < 0 ||
      age > 120
    ) {
      return {
        valid: false,
        age: null,
        message:
          "La fecha de nacimiento está fuera del rango permitido."
      };
    }

    return {
      valid: true,
      age,
      message:
        age < 18
          ? `Te registrarás con ${age} años. La cuenta quedará identificada como menor de edad.`
          : `Te registrarás con ${age} años.`
    };
  }

  function getTodayForDateInput() {
    const today =
      new Date();

    const year =
      today.getFullYear();

    const month =
      String(
        today.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        today.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${day}`;
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

  function translateAuthError(error) {
    const message =
      String(
        error?.message ?? ""
      ).toLowerCase();

    if (
      message.includes(
        "already registered"
      ) ||
      message.includes(
        "already been registered"
      ) ||
      message.includes(
        "user already exists"
      )
    ) {
      return "Este correo ya tiene una cuenta registrada.";
    }

    if (
      message.includes(
        "invalid login credentials"
      )
    ) {
      return "Correo o contraseña incorrectos.";
    }

    if (
      message.includes(
        "email not confirmed"
      )
    ) {
      return "Debes confirmar tu correo antes de iniciar sesión.";
    }

    if (
      message.includes(
        "correo_no_autorizado_como_estudiante"
      )
    ) {
      return "El correo no está autorizado como estudiante COAR.";
    }

    if (
      message.includes(
        "correo_no_autorizado_como_administrador"
      )
    ) {
      return "El correo no está autorizado como administrador.";
    }

    if (
      message.includes(
        "correo_no_autorizado_como_personal"
      )
    ) {
      return "El correo no está autorizado como personal.";
    }

    if (
      message.includes(
        "fecha_nacimiento_invalida"
      )
    ) {
      return "La fecha de nacimiento ingresada no es válida.";
    }

    if (
      message.includes(
        "la_fecha_nacimiento_no_puede_ser_futura"
      )
    ) {
      return "La fecha de nacimiento no puede estar en el futuro.";
    }

    if (
      message.includes(
        "fecha_nacimiento_fuera_de_rango"
      )
    ) {
      return "La fecha de nacimiento está fuera del rango permitido.";
    }

    if (
      message.includes(
        "la sesión fue bloqueada por seguridad"
      ) ||
      message.includes(
        "sesión fue bloqueada"
      )
    ) {
      return (
        "La sesión fue bloqueada por seguridad. " +
        "Vuelve a iniciar sesión o solicita una revisión administrativa."
      );
    }

    if (
      message.includes(
        "no se cargó el módulo de seguridad"
      )
    ) {
      return (
        "No se cargó el módulo de seguridad. " +
        "Verifica que security-session.js esté incluido antes de auth-supabase.js."
      );
    }

    if (
      message.includes(
        "no se pudo verificar la sesión segura"
      )
    ) {
      return (
        "No se pudo verificar la sesión segura. " +
        "Inténtalo nuevamente."
      );
    }

    if (
      message.includes(
        "database error saving new user"
      )
    ) {
      return (
        "El servidor rechazó el registro. " +
        "Verifica el correo, la fecha de nacimiento y el rol seleccionado."
      );
    }

    if (
      message.includes(
        "mfa phone"
      ) ||
      message.includes(
        "phone factor"
      ) ||
      message.includes(
        "phone mfa"
      )
    ) {
      return (
        "La verificación por celular no está habilitada en Supabase para este proyecto."
      );
    }

    if (
      message.includes(
        "password"
      )
    ) {
      return (
        "La contraseña no cumple los requisitos de seguridad. " +
        "Usa al menos 6 caracteres."
      );
    }

    return (
      error?.message ||
      "Ocurrió un error al comunicarse con Supabase."
    );
  }

  async function validateRoleEmail(
    database,
    role,
    email
  ) {
    if (role === "student") {
      if (
        !email.endsWith(
          "@lima.coar.edu.pe"
        )
      ) {
        return {
          valid: false,
          message:
            "Usa un correo que termine en @lima.coar.edu.pe."
        };
      }

      const {
        data,
        error
      } = await database.rpc(
        "verificar_correo_estudiante",
        {
          correo_ingresado:
            email
        }
      );

      if (error) {
        console.error(
          "Error validando estudiante:",
          error
        );

        return {
          valid: false,
          message:
            "No se pudo verificar el correo institucional."
        };
      }

      return {
        valid:
          data === true,

        message:
          data === true
            ? "Correo institucional verificado correctamente."
            : "Este correo no figura en la base institucional de estudiantes COAR."
      };
    }

    if (role === "admin") {
      const {
        data,
        error
      } = await database.rpc(
        "verificar_correo_administrador",
        {
          correo_ingresado:
            email
        }
      );

      if (error) {
        console.error(
          "Error validando administrador:",
          error
        );

        return {
          valid: false,
          message:
            "No se pudo validar el acceso administrativo."
        };
      }

      return {
        valid:
          data === true,

        message:
          data === true
            ? "Correo administrativo verificado correctamente."
            : "Este correo no está autorizado como administrador."
      };
    }

    if (role === "staff") {
      return {
        valid: true,
        message:
          "El servidor verificará que el correo pertenezca al personal autorizado."
      };
    }

    return {
      valid: true,
      message:
        "Correo válido para una cuenta externa."
    };
  }

  async function getOwnProfile(
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
        correo,
        nombres,
        apellidos,
        rol,
        estado,
        codigo_usuario,
        edad_al_registrarse,
        era_menor_al_registrarse,
        nivel_proteccion,
        requiere_supervision,
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

  function saveCurrentUser(
    authUser,
    profile
  ) {
    const roleData =
      ROLE_CONFIG[
        profile.rol
      ] ?? {
        label:
          profile.rol
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
        roleData.label,

      status:
        profile.estado,

      userCode:
        profile.codigo_usuario,

      ageAtRegistration:
        profile.edad_al_registrarse,

      minorAtRegistration:
        profile.era_menor_al_registrarse,

      protectionLevel:
        profile.nivel_proteccion,

      requiresSupervision:
        profile.requiere_supervision,

      institutionalVerified:
        profile.cuenta_institucional_verificada,

      authProvider:
        "supabase"
    };

    /*
     * No se guarda la contraseña
     * ni la fecha de nacimiento exacta.
     */

    localStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify(
        currentUser
      )
    );

    localStorage.removeItem(
      "hallazgo_pending_user"
    );
  }

  async function registerSecuritySession() {
    if (
      !window.HallazgoSecuritySession
    ) {
      throw new Error(
        "No se cargó el módulo de seguridad de HallazGo."
      );
    }

    const result =
      await window
        .HallazgoSecuritySession
        .register();

    if (!result.ok) {
      if (
        result.code ===
        "BLOCKED"
      ) {
        throw new Error(
          "La sesión fue bloqueada por seguridad."
        );
      }

      throw (
        result.error ||
        new Error(
          "No se pudo verificar la sesión segura."
        )
      );
    }

    return result.session;
  }
  async function requireInstitutionalMfa(
    database,
    authUser,
    profile
  ) {
    /*
     * HallazGo exige MFA telefónico para cualquier rol.
     * La comprobación institucional adicional se conserva
     * para staff y admin.
     */

    if (
      ["staff", "admin"].includes(profile.rol) &&
      profile.cuenta_institucional_verificada !== true
    ) {
      await database.auth.signOut();

      throw new Error(
        "La cuenta institucional no está verificada."
      );
    }

    const destination =
      localStorage.getItem(
        AFTER_LOGIN_KEY
      ) ||
      "reportar-objeto.html";

    function prepareMfaRedirect(
      mode
    ) {
      sessionStorage.setItem(
        "hallazgo_pending_mfa_user",
        JSON.stringify({
          authUser: {
            id:
              authUser.id,

            email:
              authUser.email ||
              ""
          },

          profile
        })
      );

      localStorage.setItem(
        "hallazgo_after_mfa",
        destination
      );

      window.location.href =
        `seguridad-cuenta.html?mode=${mode}`;
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

    const verifiedPhoneFactors =
      phoneFactors.filter(
        (factor) =>
          factor.status ===
          "verified"
      );

    /*
     * Si todavía no hay un teléfono verificado,
     * se obliga al usuario a registrarlo.
     */

    if (
      verifiedPhoneFactors.length === 0
    ) {
      prepareMfaRedirect(
        "enroll"
      );

      return false;
    }

    const {
      data: assuranceData,
      error: assuranceError
    } = await database.auth.mfa
      .getAuthenticatorAssuranceLevel();

    if (assuranceError) {
      throw assuranceError;
    }

    /*
     * En un login convencional la sesión queda en AAL1.
     * El desafío telefónico la elevará a AAL2.
     */

    if (
      assuranceData
        ?.currentLevel !==
      "aal2"
    ) {
      prepareMfaRedirect(
        "challenge"
      );

      return false;
    }

    sessionStorage.removeItem(
      "hallazgo_pending_mfa_user"
    );

    return true;
  }

  function redirectAfterAuthentication() {
    const savedDestination =
      localStorage.getItem(
        AFTER_LOGIN_KEY
      );

    if (savedDestination) {
      localStorage.removeItem(
        AFTER_LOGIN_KEY
      );

      window.location.href =
        savedDestination;

      return;
    }

    window.location.href =
      "reportar-objeto.html";
  }

  function initSupabaseAccess() {
    const section =
      document.querySelector(
        "[data-acceso-section]"
      );

    if (
      !(section instanceof HTMLElement)
    ) {
      return;
    }

    const database =
      window.HallazgoDB;

    const params =
      new URLSearchParams(
        window.location.search
      );

    const requestedRole =
      params.get("role") ||
      "person";

    const role =
      ROLE_CONFIG[
        requestedRole
      ]
        ? requestedRole
        : "person";

    const roleData =
      ROLE_CONFIG[role];

    const title =
      section.querySelector(
        "[data-role-title]"
      );

    const description =
      section.querySelector(
        "[data-role-description]"
      );

    const registerTitle =
      section.querySelector(
        "[data-register-title]"
      );

    const loginTitle =
      section.querySelector(
        "[data-login-title]"
      );

    const requestedRoleInput =
      section.querySelector(
        "[data-requested-role]"
      );

    const selectedRoleMessage =
      section.querySelector(
        "[data-selected-role-message]"
      );

    const loginRoleMessage =
      section.querySelector(
        "[data-login-role-message]"
      );

    const registerForm =
      section.querySelector(
        "[data-register-form]"
      );

    const loginForm =
      section.querySelector(
        "[data-login-form]"
      );

    const verifyForm =
      section.querySelector(
        "[data-verify-form]"
      );

    const registerTab =
      section.querySelector(
        '[data-auth-tab="register"]'
      );

    const loginTab =
      section.querySelector(
        '[data-auth-tab="login"]'
      );

    const registerEmail =
      section.querySelector(
        "[data-register-email]"
      );

    const birthDateInput =
      section.querySelector(
        "[data-birth-date]"
      );

    const ageFeedback =
      section.querySelector(
        "[data-age-feedback]"
      );

    const rolePreview =
      section.querySelector(
        "[data-role-preview]"
      );

    const registerFeedback =
      section.querySelector(
        "[data-register-feedback]"
      );

    const loginFeedback =
      section.querySelector(
        "[data-login-feedback]"
      );

    function setFormVisibility(
      form,
      visible
    ) {
      if (
        !(form instanceof HTMLFormElement)
      ) {
        return;
      }

      form.hidden =
        !visible;

      form.style.display =
        visible
          ? "grid"
          : "none";

      form.setAttribute(
        "aria-hidden",
        String(!visible)
      );
    }

    function showTab(tab) {
      const showRegister =
        tab === "register";

      const showLogin =
        tab === "login";

      setFormVisibility(
        registerForm,
        showRegister
      );

      setFormVisibility(
        loginForm,
        showLogin
      );

      setFormVisibility(
        verifyForm,
        false
      );

      registerTab?.classList.toggle(
        "is-active",
        showRegister
      );

      loginTab?.classList.toggle(
        "is-active",
        showLogin
      );

      registerTab?.setAttribute(
        "aria-selected",
        String(showRegister)
      );

      loginTab?.setAttribute(
        "aria-selected",
        String(showLogin)
      );

      setFeedback(
        registerFeedback,
        ""
      );

      setFeedback(
        loginFeedback,
        ""
      );
    }
    if (
      title instanceof HTMLElement
    ) {
      title.textContent =
        roleData.title;
    }

    if (
      description instanceof HTMLElement
    ) {
      description.textContent =
        roleData.description;
    }

    if (
      registerTitle instanceof
      HTMLElement
    ) {
      registerTitle.textContent =
        `Crear cuenta - ${roleData.label}`;
    }

    if (
      loginTitle instanceof
      HTMLElement
    ) {
      loginTitle.textContent =
        `Iniciar sesión - ${roleData.label}`;
    }

    if (
      requestedRoleInput instanceof
      HTMLInputElement
    ) {
      requestedRoleInput.value =
        role;
    }

    if (
      selectedRoleMessage instanceof
      HTMLElement
    ) {
      selectedRoleMessage.textContent =
        roleData.message;
    }

    if (
      loginRoleMessage instanceof
      HTMLElement
    ) {
      loginRoleMessage.textContent =
        `Estás ingresando como: ${roleData.label}.`;
    }

    registerTab?.addEventListener(
      "click",
      () =>
        showTab("register")
    );

    loginTab?.addEventListener(
      "click",
      () =>
        showTab("login")
    );

    if (
      registerEmail instanceof
        HTMLInputElement &&
      rolePreview instanceof
        HTMLElement
    ) {
      registerEmail.addEventListener(
        "input",
        () => {
          const email =
            normalizeEmail(
              registerEmail.value
            );

          if (!email) {
            rolePreview.textContent =
              "Ingresa tu correo para validarlo.";

            return;
          }

          if (
            role ===
            "student"
          ) {
            rolePreview.textContent =
              email.endsWith(
                "@lima.coar.edu.pe"
              )
                ? "El correo será validado con la base institucional."
                : "El correo debe terminar en @lima.coar.edu.pe.";

            return;
          }

          rolePreview.textContent =
            `El correo será validado como ${roleData.label}.`;
        }
      );
    }

    if (
      birthDateInput instanceof
        HTMLInputElement &&
      ageFeedback instanceof
        HTMLElement
    ) {
      birthDateInput.max =
        getTodayForDateInput();

      birthDateInput.addEventListener(
        "input",
        () => {
          if (
            !birthDateInput.value
          ) {
            setFeedback(
              ageFeedback,
              "Se registrará la edad que tienes al crear la cuenta para aplicar las medidas de protección correspondientes."
            );

            return;
          }

          const validation =
            validateBirthDate(
              birthDateInput.value
            );

          setFeedback(
            ageFeedback,
            validation.message,
            !validation.valid
          );
        }
      );
    }

    /*
     * REGISTRO
     */

    if (
      registerForm instanceof
      HTMLFormElement
    ) {
      registerForm.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();

          if (
            !registerForm.checkValidity()
          ) {
            registerForm.reportValidity();
            return;
          }

          if (!database) {
            setFeedback(
              registerFeedback,
              "No se pudo conectar con Supabase. Recarga la página.",
              true
            );

            return;
          }

          const formData =
            new FormData(
              registerForm
            );

          const firstName =
            String(
              formData.get(
                "firstName"
              ) || ""
            ).trim();

          const lastName =
            String(
              formData.get(
                "lastName"
              ) || ""
            ).trim();

          const email =
            normalizeEmail(
              formData.get(
                "email"
              )
            );

          const birthDate =
            String(
              formData.get(
                "birthDate"
              ) || ""
            ).trim();

          const password =
            String(
              formData.get(
                "password"
              ) || ""
            );

          const confirmPassword =
            String(
              formData.get(
                "confirmPassword"
              ) || ""
            );

          const birthDateValidation =
            validateBirthDate(
              birthDate
            );

          if (
            !birthDateValidation.valid
          ) {
            setFeedback(
              registerFeedback,
              birthDateValidation.message,
              true
            );

            setFeedback(
              ageFeedback,
              birthDateValidation.message,
              true
            );

            if (
              birthDateInput instanceof
              HTMLInputElement
            ) {
              birthDateInput.focus();
            }

            return;
          }

          if (
            password !==
            confirmPassword
          ) {
            setFeedback(
              registerFeedback,
              "Las contraseñas no coinciden.",
              true
            );

            return;
          }

          const submitButton =
            registerForm.querySelector(
              '[data-register-submit], button[type="submit"]'
            );

          const originalText =
            submitButton?.textContent ||
            "Continuar";

          if (
            submitButton instanceof
            HTMLButtonElement
          ) {
            submitButton.disabled =
              true;

            submitButton.textContent =
              "Creando cuenta...";
          }

          try {
            setFeedback(
              registerFeedback,
              "Validando el correo..."
            );

            const validation =
              await validateRoleEmail(
                database,
                role,
                email
              );

            if (
              !validation.valid
            ) {
              setFeedback(
                registerFeedback,
                validation.message,
                true
              );

              if (
                rolePreview instanceof
                HTMLElement
              ) {
                rolePreview.textContent =
                  validation.message;
              }

              return;
            }

            setFeedback(
              registerFeedback,
              "Correo verificado. Creando la cuenta segura..."
            );

            const {
              data,
              error
            } =
              await database
                .auth
                .signUp({
                  email,
                  password,

                  options: {
                    data: {
                      first_name:
                        firstName,

                      last_name:
                        lastName,

                      requested_role:
                        role,

                      fecha_nacimiento:
                        birthDate
                    }
                  }
                });

            if (error) {
              throw error;
            }

            if (!data.user) {
              throw new Error(
                "Supabase no devolvió el usuario creado."
              );
            }

            if (!data.session) {
              setFeedback(
                registerFeedback,
                "La cuenta fue creada. Revisa tu correo para confirmar el acceso."
              );

              showTab(
                "login"
              );

              return;
            }

            const profile =
              await getOwnProfile(
                database,
                data.user.id
              );

            const mfaCompleted =
              await requireInstitutionalMfa(
                database,
                data.user,
                profile
              );

            /*
             * Para staff y admin, la página
             * cambiará a seguridad-cuenta.html.
             */

            if (!mfaCompleted) {
              return;
            }

            const securitySession =
              await registerSecuritySession();

            console.log(
              "Sesión de seguridad registrada:",
              securitySession
            );

            saveCurrentUser(
              data.user,
              profile
            );

            setFeedback(
              registerFeedback,
              "Cuenta creada correctamente."
            );

            redirectAfterAuthentication();
          } catch (error) {
            console.error(
              "Error creando la cuenta:",
              error
            );

            setFeedback(
              registerFeedback,
              translateAuthError(
                error
              ),
              true
            );
          } finally {
            if (
              submitButton instanceof
              HTMLButtonElement
            ) {
              submitButton.disabled =
                false;

              submitButton.textContent =
                originalText;
            }
          }
        }
      );
    }

    /*
     * INICIO DE SESIÓN
     */

    if (
      loginForm instanceof
      HTMLFormElement
    ) {
      loginForm.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();

          if (
            !loginForm.checkValidity()
          ) {
            loginForm.reportValidity();
            return;
          }

          if (!database) {
            setFeedback(
              loginFeedback,
              "No se pudo conectar con Supabase. Recarga la página.",
              true
            );

            return;
          }

          const formData =
            new FormData(
              loginForm
            );

          const email =
            normalizeEmail(
              formData.get(
                "email"
              )
            );

          const password =
            String(
              formData.get(
                "password"
              ) || ""
            );

          const submitButton =
            loginForm.querySelector(
              'button[type="submit"]'
            );

          const originalText =
            submitButton?.textContent ||
            "Continuar";

          if (
            submitButton instanceof
            HTMLButtonElement
          ) {
            submitButton.disabled =
              true;

            submitButton.textContent =
              "Ingresando...";
          }

          try {
            setFeedback(
              loginFeedback,
              "Verificando credenciales..."
            );

            const {
              data,
              error
            } =
              await database
                .auth
                .signInWithPassword({
                  email,
                  password
                });

            if (error) {
              throw error;
            }

            if (
              !data.user ||
              !data.session
            ) {
              throw new Error(
                "No se pudo iniciar la sesión."
              );
            }

            const profile =
              await getOwnProfile(
                database,
                data.user.id
              );

            if (
              profile.estado !==
              "activo"
            ) {
              await database.auth
                .signOut();

              throw new Error(
                "Esta cuenta está bloqueada o suspendida."
              );
            }

            if (
              profile.rol !==
              role
            ) {
              await database.auth
                .signOut();

              throw new Error(
                `Esta cuenta pertenece al rol "${
                  ROLE_CONFIG[
                    profile.rol
                  ]?.label ||
                  profile.rol
                }", no a "${roleData.label}".`
              );
            }

            const mfaCompleted =
              await requireInstitutionalMfa(
                database,
                data.user,
                profile
              );

            if (!mfaCompleted) {
              return;
            }

            const securitySession =
              await registerSecuritySession();

            console.log(
              "Sesión de seguridad registrada:",
              securitySession
            );

            saveCurrentUser(
              data.user,
              profile
            );

            setFeedback(
              loginFeedback,
              "Inicio de sesión correcto."
            );

            redirectAfterAuthentication();
          } catch (error) {
            console.error(
              "Error iniciando sesión:",
              error
            );

            setFeedback(
              loginFeedback,
              translateAuthError(
                error
              ),
              true
            );
          } finally {
            if (
              submitButton instanceof
              HTMLButtonElement
            ) {
              submitButton.disabled =
                false;

              submitButton.textContent =
                originalText;
            }
          }
        }
      );
    }

    showTab(
      "register"
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initSupabaseAccess,
      {
        once: true
      }
    );
  } else {
    initSupabaseAccess();
  }
})();