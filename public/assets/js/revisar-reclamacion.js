"use strict";

(() => {
  const page = document.querySelector(
    "[data-claim-review-page]"
  );

  if (!(page instanceof HTMLElement)) {
    return;
  }

  const statusElement = page.querySelector(
    "[data-claim-review-status]"
  );

  const contentElement = page.querySelector(
    "[data-claim-review-content]"
  );

  const decisionSection = page.querySelector(
    "[data-claim-decision-section]"
  );

  const decisionForm = page.querySelector(
    "[data-claim-decision-form]"
  );

  const physicalCheck = page.querySelector(
    "[data-physical-check]"
  );

  const feedbackElement = page.querySelector(
    "[data-claim-decision-feedback]"
  );

  const finalSection = page.querySelector(
    "[data-claim-final]"
  );

  const chatEntry = page.querySelector(
    "[data-claim-chat-entry]"
  );

  const chatLink = page.querySelector(
    "[data-claim-chat-link]"
  );

  const chatNote = page.querySelector(
    "[data-claim-chat-note]"
  );

  let currentClaim = null;
  let currentReport = null;
  let processingDecision = false;

  function getText(selector) {
    return page.querySelector(selector);
  }

  function setText(selector, value) {
    const element = getText(selector);

    if (element instanceof HTMLElement) {
      element.textContent =
        value || "No proporcionado";
    }
  }

  function formatDate(value) {
    if (!value) {
      return "No proporcionado";
    }

    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
      return "No proporcionado";
    }

    return new Intl.DateTimeFormat(
      "es-PE",
      {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }
    ).format(date);
  }

  function getClaimStatusLabel(status) {
    const labels = {
      pendiente: "Pendiente",
      en_revision: "En revisión",
      aceptada: "Aceptada",
      rechazada: "Rechazada",
      sospechosa: "Sospechosa",
      cancelada: "Cancelada",
      completada: "Completada"
    };

    return labels[status] || status;
  }

  function getReportStatusLabel(status) {
    const labels = {
      publicado: "Publicado",
      reclamado: "Con reclamación",
      en_revision: "En revisión",
      reservado: "Reservado",
      entregado: "Entregado",
      cerrado: "Cerrado"
    };

    return labels[status] || status;
  }

  function showStatus(message, isError = false) {
    if (!(statusElement instanceof HTMLElement)) {
      return;
    }

    statusElement.hidden = false;
    statusElement.textContent = message;

    statusElement.classList.toggle(
      "is-error",
      isError
    );

    if (contentElement instanceof HTMLElement) {
      contentElement.hidden = true;
    }
  }

  function showFeedback(message, isError = false) {
    if (!(feedbackElement instanceof HTMLElement)) {
      return;
    }

    feedbackElement.textContent = message;

    feedbackElement.classList.toggle(
      "is-error",
      isError
    );

    feedbackElement.classList.toggle(
      "is-success",
      !isError
    );
  }

  function renderClaim() {
    if (
      !currentClaim ||
      !currentReport ||
      !(contentElement instanceof HTMLElement) ||
      !(statusElement instanceof HTMLElement)
    ) {
      return;
    }

    statusElement.hidden = true;
    contentElement.hidden = false;

    setText(
      "[data-claim-code]",
      currentClaim.codigo
    );

    setText(
      "[data-claim-status]",
      getClaimStatusLabel(
        currentClaim.estado
      )
    );

    setText(
      "[data-report-name]",
      currentReport.nombre_objeto
    );

    setText(
      "[data-report-code]",
      currentReport.codigo
    );

    setText(
      "[data-report-category]",
      currentReport.categoria
    );

    setText(
      "[data-report-color]",
      currentReport.color
    );

    setText(
      "[data-report-location]",
      currentReport.lugar_aproximado
    );

    setText(
      "[data-report-date]",
      formatDate(
        currentReport.fecha_aproximada
      )
    );

    setText(
      "[data-report-status]",
      getReportStatusLabel(
        currentReport.estado
      )
    );

    setText(
      "[data-claim-description]",
      currentClaim.descripcion_detallada
    );

    setText(
      "[data-claim-mark]",
      currentClaim.marca_iniciales
    );

    setText(
      "[data-claim-contents]",
      currentClaim.contenido_accesorios
    );

    setText(
      "[data-claim-detail]",
      currentClaim.detalle_particular
    );

    setText(
      "[data-claim-location]",
      currentClaim.lugar_perdida
    );

    setText(
      "[data-claim-date]",
      formatDate(
        currentClaim.fecha_perdida
      )
    );

    const finalStates = [
      "aceptada",
      "rechazada",
      "sospechosa",
      "cancelada",
      "completada"
    ];

    if (
      finalStates.includes(
        currentClaim.estado
      )
    ) {
      showFinalDecision(
        currentClaim.estado
      );
    }
  }

  async function markAsUnderReview() {
    if (
      !currentClaim ||
      currentClaim.estado !== "pendiente"
    ) {
      return;
    }

    const {
      data,
      error
    } = await window.HallazgoDB
      .from("reclamaciones")
      .update({
        estado: "en_revision",
        comentario_revision:
          "Reclamación abierta para comprobación manual."
      })
      .eq(
        "id",
        currentClaim.id
      )
      .select(`
        id,
        codigo,
        reporte_id,
        reclamante_id,
        descripcion_detallada,
        marca_iniciales,
        contenido_accesorios,
        detalle_particular,
        lugar_perdida,
        fecha_perdida,
        estado,
        comentario_revision,
        creado_en,
        revisado_en
      `)
      .single();

    if (error) {
      console.warn(
        "No se pudo cambiar a en revisión:",
        error
      );

      return;
    }

    currentClaim = data;
    renderClaim();
  }

  async function loadClaim(claimId) {
    const {
      data: claim,
      error: claimError
    } = await window.HallazgoDB
      .from("reclamaciones")
      .select(`
        id,
        codigo,
        reporte_id,
        reclamante_id,
        descripcion_detallada,
        marca_iniciales,
        contenido_accesorios,
        detalle_particular,
        lugar_perdida,
        fecha_perdida,
        estado,
        comentario_revision,
        creado_en,
        revisado_en
      `)
      .eq(
        "id",
        claimId
      )
      .single();

    if (claimError || !claim) {
      console.error(
        "No se pudo cargar la reclamación:",
        claimError
      );

      showStatus(
        "No se encontró la reclamación o no tienes permiso para revisarla.",
        true
      );

      return;
    }

    const {
      data: report,
      error: reportError
    } = await window.HallazgoDB
      .from("reportes")
      .select(`
        id,
        codigo,
        creador_id,
        nombre_objeto,
        categoria,
        color,
        lugar_aproximado,
        fecha_aproximada,
        estado
      `)
      .eq(
        "id",
        claim.reporte_id
      )
      .single();

    if (reportError || !report) {
      console.error(
        "No se pudo cargar el reporte:",
        reportError
      );

      showStatus(
        "La reclamación existe, pero no se pudo cargar el reporte relacionado.",
        true
      );

      return;
    }

    currentClaim = claim;
    currentReport = report;

    renderClaim();
    await markAsUnderReview();
  }

  async function renderChatEntry() {
    if (
      !(chatEntry instanceof HTMLElement) ||
      !(chatLink instanceof HTMLAnchorElement) ||
      !(chatNote instanceof HTMLElement)
    ) {
      return;
    }

    chatEntry.hidden = true;
    chatLink.hidden = true;
    chatLink.removeAttribute("href");

    if (
      !currentClaim ||
      currentClaim.estado !== "aceptada" ||
      !window.HallazgoDB
    ) {
      return;
    }

    chatEntry.hidden = false;
    chatNote.textContent =
      "Comprobando disponibilidad de la conversación...";

    const {
      data: conversation,
      error
    } = await window.HallazgoDB
      .from("conversaciones")
      .select(`
        id,
        estado,
        requiere_moderacion
      `)
      .eq(
        "reclamacion_id",
        currentClaim.id
      )
      .maybeSingle();

    if (error) {
      console.error(
        "No se pudo consultar la conversación:",
        error
      );

      chatNote.textContent =
        "La reclamación fue aceptada, pero no fue posible consultar la conversación.";
      return;
    }

    if (!conversation) {
      chatNote.textContent =
        "La reclamación fue aceptada. La conversación todavía no está disponible para esta cuenta.";
      return;
    }

    if (conversation.estado === "bloqueada") {
      chatNote.textContent =
        "La coordinación directa está bloqueada por las reglas de protección de HallazGo.";
      return;
    }

    chatLink.href =
      `chat.html?id=${
        encodeURIComponent(
          conversation.id
        )
      }`;

    chatLink.hidden = false;

    if (
      conversation.estado ===
      "pendiente_moderacion"
    ) {
      chatLink.textContent =
        "Ver coordinación";
      chatNote.textContent =
        "La conversación requiere intervención administrativa antes de habilitar mensajes entre los participantes.";
      return;
    }

    if (conversation.estado === "cerrada") {
      chatLink.textContent =
        "Ver conversación";
      chatNote.textContent =
        "La conversación ya fue cerrada y se conserva como registro.";
      return;
    }

    chatLink.textContent =
      "Coordinar entrega";
    chatNote.textContent =
      "La reclamación fue aceptada. Ya puedes abrir la conversación privada para coordinar la entrega.";
  }

  function showFinalDecision(status) {
    if (
      !(decisionSection instanceof HTMLElement) ||
      !(finalSection instanceof HTMLElement)
    ) {
      return;
    }

    decisionSection.hidden = true;
    finalSection.hidden = false;

    const titleElement = finalSection.querySelector(
      "[data-claim-final-title]"
    );

    const messageElement = finalSection.querySelector(
      "[data-claim-final-message]"
    );

    const content = {
      aceptada: {
        title: "Reclamación aceptada",
        message:
          "La información fue confirmada. HallazGo verificará los roles y habilitará la coordinación de entrega cuando corresponda."
      },

      rechazada: {
        title: "Reclamación rechazada",
        message:
          "La información no permitió confirmar la propiedad. El chat permanecerá bloqueado."
      },

      sospechosa: {
        title: "Reclamación marcada como sospechosa",
        message:
          "La solicitud fue enviada a revisión administrativa. El chat permanecerá bloqueado."
      },

      cancelada: {
        title: "Reclamación cancelada",
        message:
          "La reclamación ya no se encuentra activa."
      },

      completada: {
        title: "Proceso completado",
        message:
          "La devolución del objeto ya fue registrada."
      }
    };

    const selected =
      content[status] || {
        title: "Reclamación revisada",
        message:
          "La decisión ya fue registrada."
      };

    if (titleElement instanceof HTMLElement) {
      titleElement.textContent =
        selected.title;
    }

    if (messageElement instanceof HTMLElement) {
      messageElement.textContent =
        selected.message;
    }

    void renderChatEntry();
  }

  function setButtonsDisabled(disabled) {
    page
      .querySelectorAll(
        "[data-claim-decision]"
      )
      .forEach((button) => {
        if (button instanceof HTMLButtonElement) {
          button.disabled = disabled;
        }
      });
  }

  async function saveDecision(decision) {
    if (
      processingDecision ||
      !currentClaim ||
      !(decisionForm instanceof HTMLFormElement)
    ) {
      return;
    }

    if (
      !(physicalCheck instanceof HTMLInputElement) ||
      !physicalCheck.checked
    ) {
      showFeedback(
        "Debes confirmar que comparaste las respuestas con el objeto físico.",
        true
      );

      physicalCheck?.focus();
      return;
    }

    if (!decisionForm.checkValidity()) {
      decisionForm.reportValidity();
      return;
    }

    const formData =
      new FormData(decisionForm);

    const comment = String(
      formData.get("comentarioRevision") || ""
    ).trim();

    const confirmationMessages = {
      aceptada:
        "¿Confirmas que el objeto coincide y deseas aceptar esta reclamación?",

      rechazada:
        "¿Confirmas que la información no coincide y deseas rechazarla?",

      sospechosa:
        "¿Deseas marcar esta reclamación como sospechosa para revisión administrativa?"
    };

    const confirmed = window.confirm(
      confirmationMessages[decision] ||
      "¿Deseas registrar esta decisión?"
    );

    if (!confirmed) {
      return;
    }

    processingDecision = true;
    setButtonsDisabled(true);

    showFeedback(
      "Registrando decisión..."
    );

    const {
      data,
      error
    } = await window.HallazgoDB
      .from("reclamaciones")
      .update({
        estado: decision,
        comentario_revision: comment
      })
      .eq(
        "id",
        currentClaim.id
      )
      .select(`
        id,
        codigo,
        reporte_id,
        reclamante_id,
        descripcion_detallada,
        marca_iniciales,
        contenido_accesorios,
        detalle_particular,
        lugar_perdida,
        fecha_perdida,
        estado,
        comentario_revision,
        creado_en,
        revisado_en
      `)
      .single();

    processingDecision = false;
    setButtonsDisabled(false);

    if (error) {
      console.error(
        "No se pudo guardar la decisión:",
        error
      );

      showFeedback(
        error.message ||
        "No se pudo registrar la decisión.",
        true
      );

      return;
    }

    currentClaim = data;

    showFeedback(
      "Decisión registrada correctamente."
    );

    setText(
      "[data-claim-status]",
      getClaimStatusLabel(
        currentClaim.estado
      )
    );

    showFinalDecision(
      currentClaim.estado
    );
  }

  async function initialize() {
    if (!window.HallazgoDB) {
      showStatus(
        "No se pudo conectar con Supabase.",
        true
      );

      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const claimId =
      params.get("id");

    if (!claimId) {
      showStatus(
        "No se indicó qué reclamación debe revisarse.",
        true
      );

      return;
    }

    const {
      data,
      error
    } = await window.HallazgoDB.auth
      .getUser();

    if (error || !data.user) {
      localStorage.setItem(
        "hallazgo_after_login",
        `revisar-reclamacion.html?id=${
          encodeURIComponent(claimId)
        }`
      );

      window.location.href =
        "seleccionar-rol.html";

      return;
    }

    await loadClaim(claimId);
  }

  page.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const decisionButton =
        event.target.closest(
          "[data-claim-decision]"
        );

      if (
        decisionButton instanceof HTMLButtonElement
      ) {
        saveDecision(
          decisionButton.dataset
            .claimDecision || ""
        );
      }
    }
  );

  initialize();
})();