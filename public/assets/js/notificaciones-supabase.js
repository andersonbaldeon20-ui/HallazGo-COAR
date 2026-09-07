"use strict";

window.HallazgoNotificationsV2 = true;

(() => {
  const page = document.querySelector(
    "[data-notifications-page]"
  );

  if (!(page instanceof HTMLElement)) {
    return;
  }

  const statusElement = page.querySelector(
    "[data-notifications-status]"
  );

  const listElement = page.querySelector(
    "[data-notifications-list]"
  );

  const unreadElement = page.querySelector(
    "[data-notifications-unread]"
  );

  const markAllButton = page.querySelector(
    "[data-notifications-mark-all]"
  );

  let currentUser = null;
  let realtimeChannel = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (character) => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        };

        return entities[character];
      }
    );
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "es-PE",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    ).format(date);
  }

  function getNotificationLabel(type) {
    const labels = {
      reclamacion_recibida:
        "Reclamación recibida",

      reclamacion_aceptada:
        "Reclamación aceptada",

      reclamacion_rechazada:
        "Reclamación rechazada",

      reclamacion_sospechosa:
        "Revisión de seguridad",

      conversacion_habilitada:
        "Conversación habilitada",

      mediacion_requerida:
        "Intervención requerida",

      mensaje_nuevo:
        "Nuevo mensaje",

      conversacion_cerrada:
        "Conversación cerrada",

      solicitud_externa_recibida:
        "Solicitud de persona externa",

      solicitud_externa_administracion:
        "Aviso administrativo",

      intervencion_administrativa:
        "Intervención administrativa",

      alerta_seguridad:
        "Alerta de seguridad"
    };

    return labels[type] || "Actividad";
  }

  function getNotificationIcon(type) {
    const icons = {
      reclamacion_recibida: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 4h14v16H5z"></path>
          <path d="M8 8h8"></path>
          <path d="M8 12h8"></path>
          <path d="M8 16h5"></path>
        </svg>
      `,

      reclamacion_aceptada: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="m8 12 2.5 2.5L16 9"></path>
        </svg>
      `,

      reclamacion_rechazada: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="m9 9 6 6"></path>
          <path d="m15 9-6 6"></path>
        </svg>
      `,

      reclamacion_sospechosa: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 3.5 20h17L12 3Z"></path>
          <path d="M12 9v5"></path>
          <path d="M12 17h.01"></path>
        </svg>
      `,

      conversacion_habilitada: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16v11H9l-5 4V5Z"></path>
          <path d="M8 9h8"></path>
          <path d="M8 12h5"></path>
        </svg>
      `,

      mensaje_nuevo: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16v11H9l-5 4V5Z"></path>
          <path d="M8 9h8"></path>
          <path d="M8 12h5"></path>
        </svg>
      `,

      alerta_seguridad: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 3.5 20h17L12 3Z"></path>
          <path d="M12 9v5"></path>
          <path d="M12 17h.01"></path>
        </svg>
      `
    };

    return (
      icons[type] ||
      icons.reclamacion_recibida
    );
  }

  function showStatus(
    message,
    isError = false
  ) {
    if (!(statusElement instanceof HTMLElement)) {
      return;
    }

    statusElement.hidden = false;
    statusElement.textContent = message;

    statusElement.classList.toggle(
      "is-error",
      isError
    );

    if (listElement instanceof HTMLElement) {
      listElement.hidden = true;
    }
  }

  function updateUnreadCounter(notifications) {
    const unreadTotal =
      notifications.filter(
        (notification) =>
          notification.leida !== true
      ).length;

    if (
      unreadElement instanceof
      HTMLElement
    ) {
      unreadElement.textContent =
        String(unreadTotal);
    }

    const sidebarBadges =
      document.querySelectorAll(
        "[data-sidebar-notification-count]"
      );

    sidebarBadges.forEach((badge) => {
      if (!(badge instanceof HTMLElement)) {
        return;
      }

      badge.textContent =
        unreadTotal > 9
          ? "9+"
          : String(unreadTotal);

      badge.hidden =
        unreadTotal === 0;
    });
  }

  function renderNotifications(notifications) {
    updateUnreadCounter(
      notifications
    );

    if (
      !(listElement instanceof HTMLElement) ||
      !(statusElement instanceof HTMLElement)
    ) {
      return;
    }

    if (!notifications.length) {
      showStatus(
        "Todavía no tienes notificaciones."
      );

      return;
    }

    statusElement.hidden = true;
    listElement.hidden = false;

    const notificationCards =
      notifications.map(
        (notification) => {
          const unreadClass =
            notification.leida
              ? ""
              : "is-unread";

          const openButtonHtml =
            notification.reclamacion_id
              ? `
                <button
                  type="button"
                  data-open-notification
                  data-notification-id="${escapeHtml(
                    notification.id
                  )}"
                  data-reclamacion-id="${escapeHtml(
                    notification.reclamacion_id
                  )}"
                >
                  Revisar actividad
                </button>
              `
              : "";

          const readButtonHtml =
            !notification.leida
              ? `
                <button
                  type="button"
                  data-read-notification="${escapeHtml(
                    notification.id
                  )}"
                >
                  Marcar como leída
                </button>
              `
              : "";

          return `
            <article
              class="hallazgo-notification ${unreadClass}"
              data-notification-id="${escapeHtml(
                notification.id
              )}"
            >
              <div class="hallazgo-notification__icon">
                ${getNotificationIcon(
                  notification.tipo
                )}
              </div>

              <div class="hallazgo-notification__content">
                <div class="hallazgo-notification__meta">
                  <span>
                    ${escapeHtml(
                      getNotificationLabel(
                        notification.tipo
                      )
                    )}
                  </span>

                  <time>
                    ${escapeHtml(
                      formatDate(
                        notification.creada_en
                      )
                    )}
                  </time>
                </div>

                <h2>
                  ${escapeHtml(
                    notification.titulo ||
                    "Nueva actividad"
                  )}
                </h2>

                <p>
                  ${escapeHtml(
                    notification.mensaje ||
                    ""
                  )}
                </p>

                <div class="hallazgo-notification__actions">
                  ${openButtonHtml}
                  ${readButtonHtml}
                </div>
              </div>
            </article>
          `;
        }
      );

    listElement.innerHTML =
      notificationCards.join("");
  }

  async function markNotificationAsRead(
    notificationId
  ) {
    if (
      !window.HallazgoDB ||
      !currentUser ||
      !notificationId
    ) {
      return false;
    }

    const { error } =
      await window.HallazgoDB
        .from("notificaciones")
        .update({
          leida: true
        })
        .eq(
          "id",
          notificationId
        )
        .eq(
          "destinatario_id",
          currentUser.id
        );

    if (error) {
      console.error(
        "No se pudo marcar la notificación:",
        error
      );

      return false;
    }

    return true;
  }

  async function markAllAsRead() {
    if (
      !window.HallazgoDB ||
      !currentUser
    ) {
      return;
    }

    if (
      markAllButton instanceof
      HTMLButtonElement
    ) {
      markAllButton.disabled = true;
      markAllButton.textContent =
        "Actualizando...";
    }

    const { error } =
      await window.HallazgoDB
        .from("notificaciones")
        .update({
          leida: true
        })
        .eq(
          "destinatario_id",
          currentUser.id
        )
        .eq(
          "leida",
          false
        );

    if (error) {
      console.error(
        "No se pudieron actualizar las notificaciones:",
        error
      );

      showStatus(
        "No se pudieron actualizar las notificaciones.",
        true
      );
    }

    if (
      markAllButton instanceof
      HTMLButtonElement
    ) {
      markAllButton.disabled = false;
      markAllButton.textContent =
        "Marcar todas como leídas";
    }

    await loadNotifications();
  }

  async function loadNotifications() {
    if (
      !window.HallazgoDB ||
      !currentUser
    ) {
      showStatus(
        "No se pudo conectar con Supabase.",
        true
      );

      return;
    }

    const {
      data,
      error
    } = await window.HallazgoDB
      .from("notificaciones")
      .select(`
        id,
        destinatario_id,
        tipo,
        titulo,
        mensaje,
        reporte_id,
        reclamacion_id,
        leida,
        creada_en
      `)
      .eq(
        "destinatario_id",
        currentUser.id
      )
      .order(
        "creada_en",
        {
          ascending: false
        }
      );

    if (error) {
      console.error(
        "No se pudieron cargar las notificaciones:",
        error
      );

      showStatus(
        "No se pudieron cargar las notificaciones.",
        true
      );

      return;
    }

    renderNotifications(
      data || []
    );
  }

  function subscribeToNotifications() {
    if (
      !window.HallazgoDB ||
      !currentUser
    ) {
      return;
    }

    realtimeChannel =
      window.HallazgoDB
        .channel(
          `hallazgo-notificaciones-${currentUser.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notificaciones",
            filter:
              `destinatario_id=eq.${currentUser.id}`
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();
  }

  async function initialize() {
    showStatus(
      "Cargando notificaciones..."
    );

    if (!window.HallazgoDB) {
      showStatus(
        "No se pudo conectar con Supabase.",
        true
      );

      return;
    }

    const {
      data,
      error
    } = await window.HallazgoDB.auth
      .getUser();

    if (
      error ||
      !data.user
    ) {
      localStorage.setItem(
        "hallazgo_after_login",
        "notificaciones.html"
      );

      window.location.href =
        "seleccionar-rol.html";

      return;
    }

    currentUser =
      data.user;

    await loadNotifications();

    subscribeToNotifications();
  }

  listElement?.addEventListener(
    "click",
    async (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const readButton =
        event.target.closest(
          "[data-read-notification]"
        );

      if (
        readButton instanceof
        HTMLButtonElement
      ) {
        const notificationId =
          readButton.dataset
            .readNotification || "";

        const updated =
          await markNotificationAsRead(
            notificationId
          );

        if (updated) {
          await loadNotifications();
        }

        return;
      }

      const openButton =
        event.target.closest(
          "[data-open-notification]"
        );

      if (
        openButton instanceof
        HTMLButtonElement
      ) {
        const notificationId =
          openButton.dataset
            .notificationId || "";

        const reclamacionId =
          openButton.dataset
            .reclamacionId || "";

        await markNotificationAsRead(
          notificationId
        );

        window.location.href =
          `revisar-reclamacion.html?id=${
            encodeURIComponent(
              reclamacionId
            )
          }`;
      }
    }
  );

  markAllButton?.addEventListener(
    "click",
    markAllAsRead
  );

  window.addEventListener(
    "beforeunload",
    () => {
      if (
        realtimeChannel &&
        window.HallazgoDB
      ) {
        window.HallazgoDB.removeChannel(
          realtimeChannel
        );
      }
    }
  );

  initialize();
})();