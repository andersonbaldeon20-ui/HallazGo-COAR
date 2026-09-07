/* ===== FIX MANUAL HALLAZGO - HEADER Y PROTECCIÓN ===== */

(() => {
  const CURRENT_USER_KEY = 'hallazgo_current_user';
  const AFTER_LOGIN_KEY = 'hallazgo_after_login';

  function getCurrentUser() {
    try {
      const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
      return user && user.email ? user : null;
    } catch (error) {
      return null;
    }
  }

  function renderHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const page = document.body.dataset.page || '';

    header.innerHTML = `
      <a class="site-header__logo" href="index.html">HallazGo</a>

      <nav class="site-header__nav" aria-label="Navegación principal">
        <a href="index.html" class="${page === 'index' ? 'is-active' : ''}">Inicio</a>
        <a href="reportar-objeto.html" class="${page === 'reportar-objeto' ? 'is-active' : ''}">Reportar Objeto</a>
        <a href="buscar-objetos.html" class="${page === 'buscar-objetos' ? 'is-active' : ''}">Buscar Objetos</a>
        <a href="mis-reportes.html" class="${page === 'mis-reportes' ? 'is-active' : ''}">Mis Reportes</a>
        <a href="como-funciona.html" class="${page === 'como-funciona' ? 'is-active' : ''}">Como Funciona</a>
      </nav>

      <a class="site-header__profile ${page === 'mi-perfil' || page === 'seleccionar-rol' || page === 'acceso-usuario' ? 'is-active' : ''}" href="mi-perfil.html" aria-label="Mi perfil">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <circle cx="12" cy="8" r="4"></circle>
          <path d="M4 21a8 8 0 0 1 16 0"></path>
        </svg>
      </a>
    `;
  }

  function protectReportPage() {
    if (document.body.dataset.page !== 'reportar-objeto') return;

    const user = getCurrentUser();

    if (!user) {
      localStorage.setItem(AFTER_LOGIN_KEY, 'reportar-objeto.html');
      window.location.href = 'seleccionar-rol.html?next=reportar';
    }
  }

  function sendRoleNextParam() {
    if (document.body.dataset.page !== 'seleccionar-rol') return;

    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');

    if (!next) return;

    document.querySelectorAll('a[href^="acceso-usuario.html?role="]').forEach((link) => {
      const url = new URL(link.getAttribute('href'), window.location.href);
      url.searchParams.set('next', next);
      link.setAttribute('href', `${url.pathname.split('/').pop()}${url.search}`);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderHeader();
      protectReportPage();
      sendRoleNextParam();
    });
  } else {
    renderHeader();
    protectReportPage();
    sendRoleNextParam();
  }
})();
(() => {
  if (
  window.HallazgoAuthV2 === true
) {
  return;
}
  const USERS_KEY = 'hallazgo_users';
  const CURRENT_USER_KEY = 'hallazgo_current_user';
  const CURRENT_USER_KEY_ALT = 'encuentracoar_current_user';
  const AFTER_LOGIN_KEY = 'hallazgo_after_login';

  function readJson(key, fallback = null) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function getCurrentUser() {
    const primary = readJson(CURRENT_USER_KEY, null);
    if (primary && primary.email) return primary;

    const secondary = readJson(CURRENT_USER_KEY_ALT, null);
    if (secondary && secondary.email) return secondary;

    return null;
  }

  function protectReportPage() {
    if (document.body.dataset.page !== 'reportar-objeto') return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
      localStorage.setItem(AFTER_LOGIN_KEY, 'reportar-objeto.html');
      window.location.replace('seleccionar-rol.html?next=reportar');
    }
  }



  function syncRoleSelectionNextParam() {
    if (document.body.dataset.page !== 'seleccionar-rol') return;

    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (!next) return;

    document.querySelectorAll('a[href^="acceso-usuario.html?role="]').forEach((link) => {
      const url = new URL(link.getAttribute('href'), window.location.href);
      url.searchParams.set('next', next);
      link.setAttribute('href', `${url.pathname.split('/').pop()}${url.search}`);
    });
  }

  function updateProfileIcon() {
    const currentUser = getCurrentUser();
    document.querySelectorAll('[data-user-name]').forEach((element) => {
      if (!currentUser) {
        element.textContent = '';
        return;
      }
      element.textContent = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
    });
  }

  protectReportPage();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { syncRoleSelectionNextParam(); updateProfileIcon(); }, { once: true });
  } else {
    syncRoleSelectionNextParam();
    updateProfileIcon();
  }
})();


/* ===== Script de acceso-usuario ===== */

  (() => {
    if (window.HallazgoAuthV2 === true) return;
    const USERS_KEY = 'hallazgo_users';
    const CURRENT_USER_KEY = 'hallazgo_current_user';
    const PENDING_USER_KEY = 'hallazgo_pending_user';

    const ADMIN_EMAILS = [
      'director@coar.edu.pe',
      'byde@coar.edu.pe'
    ];

    const AUTHORIZED_STAFF_EMAILS = [
      'seguridad@coar.edu.pe',
      'limpieza@coar.edu.pe',
      'auxiliar@coar.edu.pe'
    ];

    const STUDENT_DOMAINS = [
      '@coar.edu.pe',
      '@coar.gob.pe',
      '@minedu.gob.pe'
    ];

    const ROLE_CONFIG = {
      person: {
        label: 'Persona',
        title: 'Acceso para persona',
        description: 'Cuenta externa al COAR. El acceso será limitado y no tendrá chat directo con usuarios COAR.',
        message: 'Seleccionaste: Persona. Usa tu correo personal para crear una cuenta con acceso limitado.'
      },
      student: {
        label: 'Estudiante COAR',
        title: 'Acceso para estudiante',
        description: 'Cuenta para estudiantes de la institución. Permite reportar, buscar y comunicarse dentro del sitio.',
        message: 'Seleccionaste: Estudiante COAR. Usa tu correo institucional para continuar.'
      },
      staff: {
        label: 'Personal autorizado',
        title: 'Acceso para personal autorizado',
        description: 'Cuenta para personal de apoyo operativo. Permite reportar, buscar y comunicarse dentro del sitio.',
        message: 'Seleccionaste: Personal autorizado. El correo debe estar autorizado por la institución.'
      },
      admin: {
        label: 'Administrador',
        title: 'Acceso administrativo',
        description: 'Cuenta para Dirección, BYDE o responsables principales. Acceso exclusivo a estadísticas y panel administrativo.',
        message: 'Seleccionaste: Administrador. Este acceso requiere validación institucional.'
      }
    };

    const ROLE_STATUS = {
      person: 'Acceso limitado',
      student: 'Verificado',
      staff: 'Verificado',
      admin: 'Verificado'
    };

    function initAccess() {
      const section = document.querySelector('[data-acceso-section]');
      if (!(section instanceof HTMLElement)) return;

      const params = new URLSearchParams(window.location.search);
      const requestedRole = params.get('role') || 'person';
      const role = ROLE_CONFIG[requestedRole] ? requestedRole : 'person';
      const roleData = ROLE_CONFIG[role];

      const title = section.querySelector('[data-role-title]');
      const description = section.querySelector('[data-role-description]');
      const registerTitle = section.querySelector('[data-register-title]');
      const loginTitle = section.querySelector('[data-login-title]');
      const requestedRoleInput = section.querySelector('[data-requested-role]');
      const selectedRoleMessage = section.querySelector('[data-selected-role-message]');
      const loginRoleMessage = section.querySelector('[data-login-role-message]');

      const registerForm = section.querySelector('[data-register-form]');
      const loginForm = section.querySelector('[data-login-form]');
      const verifyForm = section.querySelector('[data-verify-form]');

      const registerTab = section.querySelector('[data-auth-tab="register"]');
      const loginTab = section.querySelector('[data-auth-tab="login"]');

      const registerEmail = section.querySelector('[data-register-email]');
      const rolePreview = section.querySelector('[data-role-preview]');
      const registerFeedback = section.querySelector('[data-register-feedback]');
      const loginFeedback = section.querySelector('[data-login-feedback]');
      const verifyFeedback = section.querySelector('[data-verify-feedback]');
      const demoCode = section.querySelector('[data-demo-code]');

      function readJson(key, fallback) {
        try {
          const value = JSON.parse(localStorage.getItem(key) || 'null');
          return value ?? fallback;
        } catch (error) {
          return fallback;
        }
      }

      function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
      }

      function redirectAfterLogin() {
        const afterLoginUrl = localStorage.getItem('hallazgo_after_login');
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next');

        if (afterLoginUrl) {
          localStorage.removeItem('hallazgo_after_login');
          window.location.href = afterLoginUrl;
          return;
        }

        if (next === 'reportar') {
          window.location.href = 'reportar-objeto.html';
          return;
        }

        window.location.href = 'mi-perfil.html';
      }

      function getUsers() {
        const users = readJson(USERS_KEY, []);
        return Array.isArray(users) ? users : [];
      }

      function saveUsers(users) {
        writeJson(USERS_KEY, users);
      }

      function normalizeEmail(email) {
        return String(email || '').trim().toLowerCase();
      }

            function getRolePreviewMessage(email) {
        const cleanEmail = normalizeEmail(email);

        if (!cleanEmail) {
          return role === 'student'
            ? 'Ingresa tu correo institucional para validarlo con la base de estudiantes.'
            : 'Ingresa tu correo para continuar.';
        }

        if (role === 'student') {
          if (!cleanEmail.endsWith('@lima.coar.edu.pe')) {
            return 'El correo debe terminar en @lima.coar.edu.pe.';
          }

          return 'El correo será validado con la base institucional al presionar Continuar.';
        }

        if (role === 'staff') {
          return 'El correo será comparado con la lista temporal de personal autorizado.';
        }

        if (role === 'admin') {
          return 'El correo será comparado con la lista temporal de administradores.';
        }

        return 'Correo para una cuenta externa con acceso limitado.';
      }

      async function validateEmailForRole(email) {
        const cleanEmail = normalizeEmail(email);

        /* Validación de estudiantes mediante Supabase */

        if (role === 'student') {
          if (!cleanEmail.endsWith('@lima.coar.edu.pe')) {
            return {
              valid: false,
              message:
                'Usa un correo institucional que termine en @lima.coar.edu.pe.'
            };
          }

          if (!window.HallazgoDB) {
            return {
              valid: false,
              message:
                'No se pudo conectar con la base de datos. Recarga la página.'
            };
          }

          const {
            data: correoAutorizado,
            error: errorValidacion
          } = await window.HallazgoDB.rpc(
            'verificar_correo_estudiante',
            {
              correo_ingresado: cleanEmail
            }
          );

          if (errorValidacion) {
            console.error(
              'Error al validar el correo:',
              errorValidacion
            );

            return {
              valid: false,
              message:
                'No se pudo verificar el correo institucional. Inténtalo nuevamente.'
            };
          }

          if (correoAutorizado !== true) {
            return {
              valid: false,
              message:
                'Este correo no figura en la base institucional de estudiantes COAR.'
            };
          }

          return {
            valid: true,
            message:
              'Correo institucional verificado correctamente.'
          };
        }

        /* Validación temporal del personal */

        if (role === 'staff') {
          const valid =
            AUTHORIZED_STAFF_EMAILS.includes(cleanEmail);

          return {
            valid,
            message: valid
              ? 'Correo de personal autorizado verificado.'
              : 'Este correo no está autorizado como personal.'
          };
        }

        /* Validación temporal de administradores */

if (role === 'admin') {
  if (!window.HallazgoDB) {
    return {
      valid: false,
      message:
        'No se pudo conectar con la base de datos. Recarga la página.'
    };
  }

  const {
    data: administradorAutorizado,
    error: errorAdministrador
  } = await window.HallazgoDB.rpc(
    'verificar_correo_administrador',
    {
      correo_ingresado: cleanEmail
    }
  );

  if (errorAdministrador) {
    console.error(
      'Error al validar administrador:',
      errorAdministrador
    );

    return {
      valid: false,
      message:
        'No se pudo validar el acceso administrativo.'
    };
  }

  return {
    valid:
      administradorAutorizado === true,

    message:
      administradorAutorizado === true
        ? 'Correo administrativo verificado.'
        : 'Este correo no está autorizado como administrador.'
  };
}

        /* Persona externa */

        return {
          valid: true,
          message:
            'Correo válido para una cuenta externa.'
        };
      }
        async function hashPassword(password) {
      if (!window.crypto?.subtle) {
          return `demo-${password}`;
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));

        return hashArray
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');
      }

      function createVerificationCode() {
        return String(Math.floor(100000 + Math.random() * 900000));
      }

      function createUserCode(roleName) {
        const prefix = {
          person: 'PER',
          student: 'EST',
          staff: 'AUT',
          admin: 'ADM'
        }[roleName] || 'USR';

        return `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      }

      function createUserId() {
        if (window.crypto?.randomUUID) {
          return window.crypto.randomUUID();
        }

        return `user-${Date.now()}`;
      }

      function setFeedback(element, message, isError = false) {
        if (!(element instanceof HTMLElement)) return;

        element.textContent = message;
        element.classList.toggle('is-error', isError);
      }

      function showTab(tab) {
        if (!(registerForm instanceof HTMLFormElement)) return;
        if (!(loginForm instanceof HTMLFormElement)) return;
        if (!(verifyForm instanceof HTMLFormElement)) return;

        registerForm.hidden = tab !== 'register';
        loginForm.hidden = tab !== 'login';
        verifyForm.hidden = true;

        registerTab?.classList.toggle('is-active', tab === 'register');
        loginTab?.classList.toggle('is-active', tab === 'login');

        setFeedback(registerFeedback, '');
        setFeedback(loginFeedback, '');
        setFeedback(verifyFeedback, '');
      }

      if (title instanceof HTMLElement) title.textContent = roleData.title;
      if (description instanceof HTMLElement) description.textContent = roleData.description;
      if (registerTitle instanceof HTMLElement) registerTitle.textContent = `Crear cuenta - ${roleData.label}`;
      if (loginTitle instanceof HTMLElement) loginTitle.textContent = `Iniciar sesión - ${roleData.label}`;
      if (requestedRoleInput instanceof HTMLInputElement) requestedRoleInput.value = role;
      if (selectedRoleMessage instanceof HTMLElement) selectedRoleMessage.textContent = roleData.message;
      if (loginRoleMessage instanceof HTMLElement) loginRoleMessage.textContent = `Estás ingresando como: ${roleData.label}.`;

      registerTab?.addEventListener('click', () => showTab('register'));
      loginTab?.addEventListener('click', () => showTab('login'));

            if (
        registerEmail instanceof HTMLInputElement &&
        rolePreview instanceof HTMLElement
      ) {
        rolePreview.textContent =
          getRolePreviewMessage(registerEmail.value);

        registerEmail.addEventListener('input', () => {
          rolePreview.textContent =
            getRolePreviewMessage(registerEmail.value);

          setFeedback(registerFeedback, '');
        });
      }

      if (registerForm instanceof HTMLFormElement) {
        registerForm.addEventListener(
          'submit',
          async (event) => {
            event.preventDefault();

            if (!registerForm.checkValidity()) {
              registerForm.reportValidity();
              return;
            }

            const formData =
              new FormData(registerForm);

            const firstName = String(
              formData.get('firstName') || ''
            ).trim();

            const lastName = String(
              formData.get('lastName') || ''
            ).trim();

            const email = normalizeEmail(
              formData.get('email')
            );

            const password = String(
              formData.get('password') || ''
            );

            const confirmPassword = String(
              formData.get('confirmPassword') || ''
            );

            if (password !== confirmPassword) {
              setFeedback(
                registerFeedback,
                'Las contraseñas no coinciden.',
                true
              );

              return;
            }

            const users = getUsers();

            const alreadyExists = users.some(
              (user) =>
                normalizeEmail(user.email) === email
            );

            if (alreadyExists) {
              setFeedback(
                registerFeedback,
                'Este correo ya tiene una cuenta registrada.',
                true
              );

              return;
            }

            const submitButton =
              registerForm.querySelector(
                'button[type="submit"]'
              );

            const originalButtonText =
              submitButton instanceof HTMLButtonElement
                ? submitButton.textContent
                : 'Continuar';

            if (
              submitButton instanceof HTMLButtonElement
            ) {
              submitButton.disabled = true;

              submitButton.textContent =
                role === 'student'
                  ? 'Validando correo...'
                  : 'Procesando...';
            }

            try {
              setFeedback(
                registerFeedback,
                role === 'student'
                  ? 'Validando correo institucional...'
                  : 'Validando datos...'
              );

              const validation =
                await validateEmailForRole(email);

              if (!validation.valid) {
                setFeedback(
                  registerFeedback,
                  validation.message,
                  true
                );

                if (
                  rolePreview instanceof HTMLElement
                ) {
                  rolePreview.textContent =
                    validation.message;
                }

                return;
              }

              if (
                rolePreview instanceof HTMLElement
              ) {
                rolePreview.textContent =
                  validation.message;
              }

              setFeedback(
                registerFeedback,
                'Correo verificado. Preparando la cuenta...'
              );

              const verificationCode =
                createVerificationCode();

              const passwordHash =
                await hashPassword(password);

              const pendingUser = {
                userId: createUserId(),

                userCode:
                  createUserCode(role),

                firstName,
                lastName,
                email,
                passwordHash,

                photo: '',

                role,

                roleLabel:
                  ROLE_CONFIG[role].label,

                status:
                  ROLE_STATUS[role],

                verificationCode,

                codeUsed: false,

                createdAt:
                  new Date().toISOString()
              };

              writeJson(
                PENDING_USER_KEY,
                pendingUser
              );

              if (
                demoCode instanceof HTMLElement
              ) {
                demoCode.textContent =
                  verificationCode;
              }

              registerForm.hidden = true;
              loginForm.hidden = true;
              verifyForm.hidden = false;
            } catch (error) {
              console.error(
                'Error durante el registro:',
                error
              );

              setFeedback(
                registerFeedback,
                'Ocurrió un error al validar el registro. Inténtalo nuevamente.',
                true
              );
            } finally {
              if (
                submitButton instanceof
                HTMLButtonElement
              ) {
                submitButton.disabled = false;

                submitButton.textContent =
                  originalButtonText || 'Continuar';
              }
            }
          }
        );
      }

                  if (verifyForm instanceof HTMLFormElement) {
        verifyForm.addEventListener(
          'submit',
          (event) => {
            event.preventDefault();

            const formData =
              new FormData(verifyForm);

            const code = String(
              formData.get('code') || ''
            ).trim();

            const pendingUser =
              readJson(
                PENDING_USER_KEY,
                null
              );

            if (!pendingUser) {
              setFeedback(
                verifyFeedback,
                'No hay una cuenta pendiente de verificación.',
                true
              );

              return;
            }

            if (
              pendingUser.verificationCode !== code
            ) {
              setFeedback(
                verifyFeedback,
                'El código de verificación no es correcto.',
                true
              );

              return;
            }

            const users = getUsers();

            const finalUser = {
              ...pendingUser,

              verificationCode: '',

              codeUsed: true,

              verifiedAt:
                new Date().toISOString()
            };

            users.push(finalUser);

            saveUsers(users);

            writeJson(
              CURRENT_USER_KEY,
              finalUser
            );

            localStorage.removeItem(
              PENDING_USER_KEY
            );

            window.location.href =
              'reportar-objeto.html';
          }
        );
      }
      if (loginForm instanceof HTMLFormElement) {
        loginForm.addEventListener(
          'submit',
          async (event) => {
            event.preventDefault();

            const formData =
              new FormData(loginForm);

            const email = normalizeEmail(
              formData.get('email')
            );

            const password = String(
              formData.get('password') || ''
            );

            const passwordHash =
              await hashPassword(password);

            const user = getUsers().find(
              (item) => {
                return (
                  normalizeEmail(item.email) === email &&
                  item.passwordHash === passwordHash
                );
              }
            );

            if (!user) {
              setFeedback(
                loginFeedback,
                'Correo o contraseña incorrectos.',
                true
              );

              return;
            }

            if (user.role !== role) {
              setFeedback(
                loginFeedback,
                `Esta cuenta pertenece a "${user.roleLabel}", no a "${ROLE_CONFIG[role].label}".`,
                true
              );

              return;
            }

            writeJson(
              CURRENT_USER_KEY,
              user
            );

            window.location.href =
              'reportar-objeto.html';
          }
        );
      }

      showTab('register');
    }

    if (
      document.readyState === 'loading'
    ) {
      document.addEventListener(
        'DOMContentLoaded',
        initAccess,
        { once: true }
      );
    } else {
      initAccess();
    }
  })();



/* ===== Vista previa de imagen o PDF ===== */

(() => {
  const MAX_FILE_BYTES = 1 * 1024 * 1024;

  const IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp'
  ]);

  function iniciarVistaPreviaDeArchivo() {
    document
      .querySelectorAll('[data-report-upload]')
      .forEach((upload) => {
        if (!(upload instanceof HTMLElement)) {
          return;
        }

        if (upload.dataset.previewReady === 'true') {
          return;
        }

        const input = upload.querySelector(
          '.reporte-objeto__file-input'
        );

        const trigger = upload.querySelector(
          '[data-report-upload-trigger]'
        );

        const fileName = upload.querySelector(
          '[data-report-upload-name]'
        );

        const preview = upload.querySelector(
          '[data-report-image-preview]'
        );

        const previewImage = upload.querySelector(
          '[data-report-image-preview-image]'
        );

        const pdfPreview = upload.querySelector(
          '[data-report-pdf-preview]'
        );

        const pdfName = upload.querySelector(
          '[data-report-pdf-name]'
        );

        const removeButton = upload.querySelector(
          '[data-report-remove-image]'
        );

        const form = upload.closest('form');

        if (
          !(input instanceof HTMLInputElement) ||
          !(trigger instanceof HTMLButtonElement) ||
          !(fileName instanceof HTMLElement) ||
          !(preview instanceof HTMLElement) ||
          !(previewImage instanceof HTMLImageElement) ||
          !(pdfPreview instanceof HTMLElement) ||
          !(pdfName instanceof HTMLElement) ||
          !(removeButton instanceof HTMLButtonElement)
        ) {
          return;
        }

        upload.dataset.previewReady = 'true';

        let objectUrl = '';

        function esImagen(file) {
          return (
            IMAGE_TYPES.has(file.type) ||
            /\.(jpe?g|png|webp)$/i.test(file.name)
          );
        }

        function esPDF(file) {
          return (
            file.type === 'application/pdf' ||
            /\.pdf$/i.test(file.name)
          );
        }

        function archivoPermitido(file) {
          return esImagen(file) || esPDF(file);
        }

        function limpiarVistaPrevia() {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = '';
          }

          previewImage.removeAttribute('src');
          previewImage.hidden = true;

          pdfPreview.hidden = true;
          pdfName.textContent = '';

          preview.hidden = true;
        }

        function mostrarArchivo(file) {
          if (!archivoPermitido(file)) {
            input.value = '';

            fileName.textContent =
              'Solo se permiten archivos JPG, PNG, WEBP o PDF.';

            limpiarVistaPrevia();
            return;
          }

          if (file.size > MAX_FILE_BYTES) {
            input.value = '';

            fileName.textContent =
              'El archivo debe pesar como máximo 1 MB.';

            limpiarVistaPrevia();
            return;
          }

          limpiarVistaPrevia();

          if (esImagen(file)) {
            objectUrl = URL.createObjectURL(file);

            previewImage.src = objectUrl;
            previewImage.hidden = false;

            pdfPreview.hidden = true;
          } else if (esPDF(file)) {
            previewImage.hidden = true;

            pdfName.textContent = file.name;
            pdfPreview.hidden = false;
          }

          preview.hidden = false;

          fileName.textContent =
            `Archivo seleccionado: ${file.name}`;
        }

        function actualizarArchivo() {
          const file = input.files?.[0];

          if (!file) {
            fileName.textContent =
              'Ningún archivo seleccionado';

            limpiarVistaPrevia();
            return;
          }

          mostrarArchivo(file);
        }

        trigger.addEventListener(
          'click',
          () => {
            input.click();
          }
        );

        input.addEventListener(
          'change',
          actualizarArchivo
        );

        removeButton.addEventListener(
          'click',
          () => {
            input.value = '';

            fileName.textContent =
              'Ningún archivo seleccionado';

            limpiarVistaPrevia();
          }
        );

        if (form instanceof HTMLFormElement) {
          form.addEventListener(
            'reset',
            () => {
              window.setTimeout(() => {
                input.value = '';

                fileName.textContent =
                  'Ningún archivo seleccionado';

                limpiarVistaPrevia();
              }, 0);
            }
          );
        }

        ['dragenter', 'dragover'].forEach(
          (eventName) => {
            upload.addEventListener(
              eventName,
              (event) => {
                event.preventDefault();

                upload.classList.add(
                  'is-dragging'
                );
              }
            );
          }
        );

        ['dragleave', 'drop'].forEach(
          (eventName) => {
            upload.addEventListener(
              eventName,
              (event) => {
                event.preventDefault();

                upload.classList.remove(
                  'is-dragging'
                );
              }
            );
          }
        );

        upload.addEventListener(
          'drop',
          (event) => {
            event.preventDefault();

            const file =
              event.dataTransfer?.files?.[0];

            if (!file) {
              return;
            }

            if (!archivoPermitido(file)) {
              fileName.textContent =
                'Solo puedes arrastrar JPG, PNG, WEBP o PDF.';

              return;
            }

            if (file.size > MAX_FILE_BYTES) {
              fileName.textContent =
                'El archivo debe pesar como máximo 1 MB.';

              return;
            }

            const dataTransfer =
              new DataTransfer();

            dataTransfer.items.add(file);
            input.files = dataTransfer.files;

            mostrarArchivo(file);
          }
        );
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      iniciarVistaPreviaDeArchivo,
      { once: true }
    );
  } else {
    iniciarVistaPreviaDeArchivo();
  }
})();



/* ===== Script de reporte-objeto ===== */

  document.addEventListener('DOMContentLoaded', () => {
    const categoria = document.getElementById('objeto-categoria');
    const campoMarca = document.querySelector('[data-brand-field]');
    const inputMarca = document.getElementById('objeto-marca');

    if (!categoria || !campoMarca || !inputMarca) return;

    function actualizarCampoMarca() {
      const categoriasSinMarca = ['Lentes', 'Llaves'];
      const ocultarCampo = categoriasSinMarca.includes(categoria.value);

      campoMarca.hidden = ocultarCampo;
      inputMarca.disabled = ocultarCampo;
    }

    categoria.addEventListener('change', actualizarCampoMarca);
    actualizarCampoMarca();
  });



/* ===== Script de reporte-objeto ===== */

  (() => {
    if (window.HallazgoReportsV2 === true) return;
    const STORAGE_KEY = 'encuentracoar_reports';

    const form = document.querySelector(
      '[data-encuentracoar-report-form], .reporte-objeto__formulario'
    );

    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.localStorageReady === 'true') return;

    /* Evita que el JavaScript externo registre el formulario dos veces. */
    form.dataset.localStorageReady = 'true';
    form.dataset.ready = 'true';

    const feedback = form.querySelector('[data-report-feedback]');
    const submitButton = form.querySelector('[data-report-submit]');
    const photoInput = form.querySelector('input[name="photo"]');

    function readReports() {
      try {
        const reports = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || '[]'
        );

        return Array.isArray(reports) ? reports : [];
      } catch (error) {
        return [];
      }
    }

    function saveReports(reports) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    }

    function readPhoto(file) {
      return new Promise((resolve, reject) => {
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();

        reader.onload = () => {
resolve({
  name: file.name,
  type: file.type,
  dataUrl: reader.result
});
        };

        reader.onerror = () => {
reject(
  new Error('No se pudo leer el archivo.')
);
        };

        reader.readAsDataURL(file);
      });
    }

    function showFeedback(message, isError = false) {
      if (!(feedback instanceof HTMLElement)) return;

      feedback.hidden = false;
      feedback.style.marginBottom = '16px';
      feedback.style.padding = '14px';
      feedback.style.borderRadius = '10px';
      feedback.style.fontWeight = '700';

      if (isError) {
        feedback.style.background = '#fff1f1';
        feedback.style.border = '1px solid #efc3c3';
        feedback.style.color = '#9f2525';
        feedback.textContent = message;
        return;
      }

      feedback.style.background = '#e7f4f0';
      feedback.style.border = '1px solid #b9dbd3';
      feedback.style.color = '#1d665d';

      feedback.innerHTML = `
        ${message}
        <br>
        <a
          href="mis-reportes.html"
          style="color:#1d665d; text-decoration:underline;"
        >
          Ver mis reportes
        </a>
      `;
    }

    function createCode() {
      return `EC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    }

    form.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (!form.checkValidity()) {
          showFeedback(
            'Completa los campos obligatorios marcados con *.',
            true
          );

          const firstInvalid = form.querySelector(':invalid');

          if (firstInvalid instanceof HTMLElement) {
            firstInvalid.focus();
          }

          return;
        }

        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = true;
          submitButton.textContent = 'Guardando reporte...';
        }

        try {
          const formData = new FormData(form);

          const file =
            photoInput instanceof HTMLInputElement
              ? photoInput.files?.[0]
              : null;

          const photo = await readPhoto(file);

          const report = {
            id:
              window.crypto && typeof window.crypto.randomUUID === 'function'
                ? window.crypto.randomUUID()
                : `report-${Date.now()}`,
            code: createCode(),
            type: form.dataset.reportType || 'Perdido',
            objectName: String(formData.get('objectName') || '').trim(),
            category: String(formData.get('category') || '').trim(),
            color: String(formData.get('color') || '').trim(),
            brand: String(formData.get('brand') || '').trim(),
            approximateDate: String(
              formData.get('approximateDate') || ''
            ).trim(),
            location: String(formData.get('location') || '').trim(),
            description: String(formData.get('description') || '').trim(),
            studentName: String(formData.get('studentName') || '').trim(),
            gradeSection: String(formData.get('gradeSection') || '').trim(),
            contact: String(formData.get('contact') || '').trim(),
            photo,
            status: 'En verificación',
            createdAt: new Date().toISOString()
          };

          const reports = readReports();
          reports.unshift(report);
          saveReports(reports);

          form.reset();

          window.dispatchEvent(
            new CustomEvent('encuentracoar:report-saved')
          );

          showFeedback(
            'Tu reporte fue registrado correctamente.'
          );
        } catch (error) {
          showFeedback(
            'No se pudo guardar el reporte. Intenta nuevamente.',
            true
          );
        } finally {
          if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar reporte';
          }
        }
      },
      true
    );
  })();



/* ===== Script de buscar-objetos ===== */

  (() => {    
    if (window.HallazgoCatalogV2 === true) return;
    const STORAGE_KEY = 'encuentracoar_reports';
    const PAGE_SIZE = 6;

    function iniciarBuscador() {
      const section = document.querySelector('[data-buscador-objetos-section]');

      if (!(section instanceof HTMLElement)) return;
      if (section.dataset.ready === 'true') return;

      section.dataset.ready = 'true';

      const form = section.querySelector('[data-catalog-form]');
      const searchInput = section.querySelector('[data-catalog-search]');
      const categorySelect = section.querySelector('[data-catalog-category]');
      const colorSelect = section.querySelector('[data-catalog-color]');
      const locationSelect = section.querySelector('[data-catalog-location]');
      const statusSelect = section.querySelector('[data-catalog-status]');
      const clearButton = section.querySelector('[data-catalog-clear]');
      const grid = section.querySelector('[data-catalog-grid]');
      const empty = section.querySelector('[data-catalog-empty]');
      const count = section.querySelector('[data-catalog-count]');
      const moreButton = section.querySelector('[data-catalog-more]');
      const modal = document.querySelector('[data-catalog-modal]');
      const modalContent = document.querySelector('[data-catalog-modal-content]');
      const modalClose = document.querySelector('[data-modal-close]');
      const claimModal = document.querySelector('[data-claim-modal]');
      const claimClose = document.querySelector('[data-claim-close]');
      const claimForm = document.querySelector('[data-claim-form]');
      const claimFeedback = document.querySelector('[data-claim-feedback]');

      if (
        !(form instanceof HTMLFormElement) ||
        !(searchInput instanceof HTMLInputElement) ||
        !(categorySelect instanceof HTMLSelectElement) ||
        !(colorSelect instanceof HTMLSelectElement) ||
        !(locationSelect instanceof HTMLSelectElement) ||
        !(statusSelect instanceof HTMLSelectElement) ||
        !(clearButton instanceof HTMLButtonElement) ||
        !(grid instanceof HTMLElement) ||
        !(empty instanceof HTMLElement) ||
        !(count instanceof HTMLElement) ||
        !(moreButton instanceof HTMLButtonElement)
      ) {
        return;
      }

      let visibleItems = [];
      let currentLimit = PAGE_SIZE;

      function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, (character) => {
          const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
          };

          return entities[character];
        });
      }

      function normalizar(value) {
        return String(value || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
      }

      function formatDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
          return 'Fecha no registrada';
        }

        return new Intl.DateTimeFormat('es-PE', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }).format(date);
      }

      function statusClass(status) {
        return normalizar(status).replace(/\s+/g, '-');
      }

      function iconoCategoria(category) {
        const iconos = {
          'Mochilas y loncheras': '🎒',
          'Casacas y ropa': '🧥',
          'Útiles escolares': '📚',
          'Botellas y tomatodos': '🧴',
          'Lentes': '👓',
          'Llaves': '🔑',
          'Dispositivos electrónicos': '📱',
          'Otros': '🔎'
        };

        return iconos[category] || '🔎';
      }

      function obtenerReportesLocales() {
        try {
          const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

          if (!Array.isArray(reports)) return [];

          return reports.map((report) => ({
            id: `report-${report.id}`,
            objectName: report.objectName || 'Objeto sin nombre',
            category: report.category || 'Otros',
            color: report.color || 'Otro',
            location: report.location || 'Lugar no registrado',
            date: report.approximateDate || report.createdAt,
            status: report.status || report.type || 'Perdido',
            description: report.description || 'Sin descripción adicional.',
            image:
  report.photo?.type?.startsWith('image/')
    ? report.photo.dataUrl
    : '',

document:
  report.photo?.type === 'application/pdf'
    ? report.photo.dataUrl
    : '',

documentName:
  report.photo?.type === 'application/pdf'
    ? report.photo.name
    : ''
          }));
        } catch (error) {
          return [];
        }
      }

      function obtenerObjetos() {
  return obtenerReportesLocales()
    .filter((item) => item.status !== 'Entregado')
    .sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
}

      function aplicarFiltros() {
        const search = normalizar(searchInput.value);
        const category = categorySelect.value;
        const color = colorSelect.value;
        const location = locationSelect.value;
        const status = statusSelect.value;

        visibleItems = obtenerObjetos().filter((item) => {
          const texto = normalizar([
            item.objectName,
            item.category,
            item.color,
            item.location,
            item.description
          ].join(' '));

          const coincideBusqueda = !search || texto.includes(search);
          const coincideCategoria = !category || item.category === category;
          const coincideColor = !color || item.color === color;
          const coincideLugar = !location || item.location === location;
          const coincideEstado = !status || item.status === status;

          return (
            coincideBusqueda &&
            coincideCategoria &&
            coincideColor &&
            coincideLugar &&
            coincideEstado
          );
        });

        currentLimit = PAGE_SIZE;
        renderizar();
      }

      function renderizar() {
        const items = visibleItems.slice(0, currentLimit);

        count.textContent = `${visibleItems.length} ${
          visibleItems.length === 1 ? 'objeto encontrado' : 'objetos encontrados'
        }`;

        grid.innerHTML = items.map((item) => {
          const image = item.image
            ? `
              <img
                class="buscar-objetos__card-image-real"
                src="${item.image}"
                alt="Foto referencial de ${escapeHtml(item.objectName)}"
              >
            `
            : `
              <div class="buscar-objetos__card-image" aria-hidden="true">
                ${iconoCategoria(item.category)}
              </div>
            `;

          return `
            <article class="buscar-objetos__card">
              ${image}

              <div class="buscar-objetos__card-content">
                <div class="buscar-objetos__card-top">
                  <h2 class="buscar-objetos__card-title">
                    ${escapeHtml(item.objectName)}
                  </h2>

                  <span class="buscar-objetos__status buscar-objetos__status--${statusClass(item.status)}">
                    ${escapeHtml(item.status)}
                  </span>
                </div>

                <div class="buscar-objetos__tags">
                  <span class="buscar-objetos__tag">
                    ${escapeHtml(item.category)}
                  </span>

                  <span class="buscar-objetos__tag">
                    ${escapeHtml(item.color)}
                  </span>

                  <span class="buscar-objetos__tag">
                    ${escapeHtml(item.location)}
                  </span>
                </div>

                <p class="buscar-objetos__card-date">
                  Registrado: ${formatDate(item.date)}
                </p>

                <div class="buscar-objetos__card-actions">
                  <button
                    class="buscar-objetos__card-button"
                    type="button"
                    data-view-object="${escapeHtml(item.id)}"
                  >
                    Ver detalles
                  </button>

                  <button
                    class="buscar-objetos__card-button buscar-objetos__card-button--claim"
                    type="button"
                    data-claim-object="${escapeHtml(item.id)}"
                  >
                    Este objeto es mío
                  </button>
                </div>
              </div>
            </article>
          `;
        }).join('');

        empty.hidden = visibleItems.length !== 0;
        moreButton.hidden = visibleItems.length <= currentLimit;
      }

      function abrirDetalles(id) {
        const item = visibleItems.find((object) => object.id === id);

        if (!item || !(modal instanceof HTMLDialogElement)) return;
        if (!(modalContent instanceof HTMLElement)) return;

        modalContent.innerHTML = `
          <h2>${escapeHtml(item.objectName)}</h2>

          <p class="buscar-objetos__modal-text">
            Esta información es pública y no muestra datos personales.
          </p>

          <div class="buscar-objetos__detail-grid">
            <div class="buscar-objetos__detail-item">
              <strong>Categoría</strong>
              ${escapeHtml(item.category)}
            </div>

            <div class="buscar-objetos__detail-item">
              <strong>Color</strong>
              ${escapeHtml(item.color)}
            </div>

            <div class="buscar-objetos__detail-item">
              <strong>Lugar</strong>
              ${escapeHtml(item.location)}
            </div>

            <div class="buscar-objetos__detail-item">
              <strong>Estado</strong>
              ${escapeHtml(item.status)}
            </div>

            <div class="buscar-objetos__detail-item">
              <strong>Fecha</strong>
              ${formatDate(item.date)}
            </div>

            <div class="buscar-objetos__detail-item">
              <strong>Descripción</strong>
              ${escapeHtml(item.description)}
            </div>
          </div>
        `;

        modal.showModal();
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        aplicarFiltros();
      });

      searchInput.addEventListener('input', aplicarFiltros);

      [categorySelect, colorSelect, locationSelect, statusSelect].forEach((select) => {
        select.addEventListener('change', aplicarFiltros);
      });

      clearButton.addEventListener('click', () => {
        form.reset();
        aplicarFiltros();
      });

      moreButton.addEventListener('click', () => {
        currentLimit += PAGE_SIZE;
        renderizar();
      });

      grid.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) return;

        const detailButton = event.target.closest('[data-view-object]');
        const claimButton = event.target.closest('[data-claim-object]');

        if (detailButton instanceof HTMLButtonElement) {
          abrirDetalles(detailButton.dataset.viewObject || '');
        }

        if (
          claimButton instanceof HTMLButtonElement &&
          claimModal instanceof HTMLDialogElement
        ) {
          if (claimFeedback instanceof HTMLElement) {
            claimFeedback.textContent = '';
          }

          claimModal.showModal();
        }
      });

      if (modalClose instanceof HTMLButtonElement && modal instanceof HTMLDialogElement) {
        modalClose.addEventListener('click', () => modal.close());
      }

      if (
        claimClose instanceof HTMLButtonElement &&
        claimModal instanceof HTMLDialogElement
      ) {
        claimClose.addEventListener('click', () => claimModal.close());
      }

      if (claimForm instanceof HTMLFormElement) {
        claimForm.addEventListener('submit', (event) => {
          event.preventDefault();

          if (!claimForm.checkValidity()) {
            claimForm.reportValidity();
            return;
          }

          if (claimFeedback instanceof HTMLElement) {
            claimFeedback.textContent =
              'Solicitud enviada. El personal responsable revisará tu descripción.';
          }

          claimForm.reset();
        });
      }
const searchParams = new URLSearchParams(window.location.search);

searchInput.value =
  searchParams.get("q") || "";

categorySelect.value =
  searchParams.get("categoria") || "";

colorSelect.value =
  searchParams.get("color") || "";

locationSelect.value =
  searchParams.get("lugar") || "";

statusSelect.value =
  searchParams.get("estado") || "";
      aplicarFiltros();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', iniciarBuscador, {
        once: true
      });
    } else {
      iniciarBuscador();
    }
  })();



/* ===== Lógica compartida HallazGo ===== */
(() => {
  const STORAGE_KEY = 'encuentracoar_reports';

  function readReports() {
    try {
      const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(reports) ? reports : [];
    } catch (error) {
      return [];
    }
  }

  function saveReports(reports) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => {
      const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };

      return entities[character];
    });
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Sin fecha registrada';
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  function normalizeStatus(status) {
    return String(status || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
resolve({
  name: file.name,
  type: file.type,
  dataUrl: reader.result
});
      };

      reader.onerror = () => {
        reject(new Error('No se pudo leer el archivo.'));
      };

      reader.readAsDataURL(file);
    });
  }

  function createReportCode() {
    return `EC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  }

  function showFeedback(feedback, message, isError = false) {
    if (!(feedback instanceof HTMLElement)) return;

    feedback.hidden = false;
    feedback.style.marginBottom = '16px';
    feedback.style.padding = '12px 14px';
    feedback.style.borderRadius = '10px';
    feedback.style.fontWeight = '700';

    if (isError) {
      feedback.style.background = '#fff1f1';
      feedback.style.color = '#9f2525';
      feedback.style.border = '1px solid #efc3c3';
      feedback.textContent = message;
      return;
    }

    feedback.style.background = '#e7f4f0';
    feedback.style.color = '#1d665d';
    feedback.style.border = '1px solid #b9dbd3';

    feedback.innerHTML = `
      ${message}
      <br>
      <a href="mis-reportes.html" style="color:#1d665d; text-decoration:underline;">
        Ver mis reportes
      </a>
    `;
  }

  function initializeReportForms() {
    document.querySelectorAll('[data-encuentracoar-report-form]').forEach((form) => {
      if (!(form instanceof HTMLFormElement)) return;
      if (form.dataset.ready === 'true') return;

      form.dataset.ready = 'true';

      const feedback = form.querySelector('[data-report-feedback]');
      const submitButton = form.querySelector('[data-report-submit]');
      const photoInput = form.querySelector('input[name="photo"]');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!form.checkValidity()) {
          showFeedback(
            feedback,
            'Completa todos los campos obligatorios marcados con *.',
            true
          );

          const firstInvalid = form.querySelector(':invalid');

          if (firstInvalid instanceof HTMLElement) {
            firstInvalid.focus();
          }

          return;
        }

        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = true;
          submitButton.textContent = 'Guardando reporte...';
        }

        try {
          const formData = new FormData(form);
          const file = photoInput instanceof HTMLInputElement
            ? photoInput.files?.[0]
            : null;

          const photo = await readImage(file);

          const report = {
            id: window.crypto?.randomUUID
              ? window.crypto.randomUUID()
              : `report-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            code: createReportCode(),
            type: form.dataset.reportType || 'Perdido',
            objectName: String(formData.get('objectName') || '').trim(),
            category: String(formData.get('category') || '').trim(),
            color: String(formData.get('color') || '').trim(),
            brand: String(formData.get('brand') || '').trim(),
            approximateDate: String(formData.get('approximateDate') || '').trim(),
            location: String(formData.get('location') || '').trim(),
            description: String(formData.get('description') || '').trim(),
            studentName: String(formData.get('studentName') || '').trim(),
            gradeSection: String(formData.get('gradeSection') || '').trim(),
            contact: String(formData.get('contact') || '').trim(),
            photo,
            status: 'En verificación',
            createdAt: new Date().toISOString()
          };

          const reports = readReports();
          reports.unshift(report);
          saveReports(reports);

          form.reset();

          window.dispatchEvent(
            new CustomEvent('encuentracoar:report-saved')
          );

          showFeedback(
            feedback,
            'Tu reporte fue registrado correctamente.'
          );
        } catch (error) {
          showFeedback(
            feedback,
            'No se pudo guardar el reporte. Intenta nuevamente.',
            true
          );
        } finally {
          if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar reporte';
          }
        }
      });
    });
  }

  function renderMyReports() {
    const section = document.querySelector('[data-mis-reportes-section]');

    if (!(section instanceof HTMLElement)) return;

    const total = section.querySelector('[data-mis-reportes-total]');
    const empty = section.querySelector('[data-mis-reportes-empty]');
    const list = section.querySelector('[data-mis-reportes-list]');

    if (
      !(total instanceof HTMLElement) ||
      !(empty instanceof HTMLElement) ||
      !(list instanceof HTMLElement)
    ) {
      return;
    }

    const reports = readReports().sort((first, second) => {
      return new Date(second.createdAt) - new Date(first.createdAt);
    });

    total.textContent = String(reports.length);

    if (!reports.length) {
      empty.hidden = false;
      list.hidden = true;
      list.innerHTML = '';
      return;
    }

    empty.hidden = true;
    list.hidden = false;

    list.innerHTML = reports.map((report) => {
      const status = report.status || 'En verificación';
      const statusClass = normalizeStatus(status);

      const image = report.photo?.dataUrl
        ? `
          <img
            class="mis-reportes__foto"
            src="${report.photo.dataUrl}"
            alt="Foto referencial de ${escapeHtml(report.objectName)}"
          >
        `
        : `
          <div class="mis-reportes__sin-foto" aria-hidden="true">
            ⌕
          </div>
        `;

      const action = status === 'Entregado'
        ? `
          <button class="mis-reportes__accion" type="button" disabled>
            Objeto recuperado
          </button>
        `
        : `
          <button
            class="mis-reportes__accion"
            type="button"
            data-mark-recovered="${escapeHtml(report.id)}"
          >
            Marcar como recuperado
          </button>
        `;

      return `
        <article class="mis-reportes__tarjeta">
          ${image}

          <div class="mis-reportes__contenido">
            <div class="mis-reportes__cabecera-tarjeta">
              <div>
                <p class="mis-reportes__codigo">
                  ${escapeHtml(report.code)}
                </p>

                <h2 class="mis-reportes__titulo">
                  ${escapeHtml(report.objectName)}
                </h2>
              </div>

              <span class="mis-reportes__estado mis-reportes__estado--${statusClass}">
                ${escapeHtml(status)}
              </span>
            </div>

            <div class="mis-reportes__datos">
              <span class="mis-reportes__dato">
                ${escapeHtml(report.type)}
              </span>

              <span class="mis-reportes__dato">
                ${escapeHtml(report.category)}
              </span>

              <span class="mis-reportes__dato">
                ${escapeHtml(report.color)}
              </span>

              <span class="mis-reportes__dato">
                ${escapeHtml(report.location)}
              </span>
            </div>

            <p class="mis-reportes__descripcion">
              ${escapeHtml(report.description)}
            </p>

            <div class="mis-reportes__pie">
              <span class="mis-reportes__fecha">
                Registrado: ${formatDate(report.createdAt)}
              </span>

              ${action}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function initializeMyReportsPage() {
    const section = document.querySelector('[data-mis-reportes-section]');

    if (!(section instanceof HTMLElement)) return;
    if (section.dataset.ready === 'true') return;

    section.dataset.ready = 'true';

    renderMyReports();

    const list = section.querySelector('[data-mis-reportes-list]');

    if (!(list instanceof HTMLElement)) return;

    list.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest('[data-mark-recovered]');

      if (!(button instanceof HTMLButtonElement)) return;

      const reportId = button.dataset.markRecovered;

      if (!reportId) return;

      const updatedReports = readReports().map((report) => {
        if (report.id !== reportId) return report;

        return {
          ...report,
          status: 'Entregado',
          updatedAt: new Date().toISOString()
        };
      });

      saveReports(updatedReports);
      renderMyReports();
    });

    window.addEventListener('encuentracoar:report-saved', renderMyReports);
  }

  function startEncuentraCOAR() {
    initializeReportForms();
    initializeMyReportsPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startEncuentraCOAR, {
      once: true
    });
  } else {
    startEncuentraCOAR();
  }
})();
/* Encabezado compacto al hacer scroll */

const cinematicHeader = document.querySelector(".cinematic-header");

function updateCinematicHeader() {
  if (!cinematicHeader) {
    return;
  }

  cinematicHeader.classList.toggle(
    "is-scrolled",
    window.scrollY > 24
  );
}

window.addEventListener(
  "scroll",
  updateCinematicHeader,
  { passive: true }
);

updateCinematicHeader();