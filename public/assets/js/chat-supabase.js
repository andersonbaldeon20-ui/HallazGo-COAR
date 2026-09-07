"use strict";

(() => {
  const page = document.querySelector(
    "[data-chat-page]"
  );

  if (!(page instanceof HTMLElement)) {
    return;
  }

  const statusElement = page.querySelector(
    "[data-chat-status]"
  );

  const contentElement = page.querySelector(
    "[data-chat-content]"
  );

  const messageList = page.querySelector(
    "[data-chat-message-list]"
  );

  const emptyElement = page.querySelector(
    "[data-chat-empty]"
  );

  const form = page.querySelector(
    "[data-chat-form]"
  );

  const textarea = page.querySelector(
    'textarea[name="message"]'
  );

  const sendButton = page.querySelector(
    "[data-chat-send]"
  );

  const feedbackElement = page.querySelector(
    "[data-chat-feedback]"
  );

  const countElement = page.querySelector(
    "[data-chat-count]"
  );

  const closedElement = page.querySelector(
    "[data-chat-closed]"
  );

  const moderatorCard = page.querySelector(
    "[data-chat-moderator-card]"
  );

  let database = null;
  let currentUser = null;
  let currentConversation = null;
  let currentReport = null;
  let currentParticipants = [];
  let profileMap = new Map();
  let realtimeChannel = null;
  let sending = false;

  function setText(selector, value) {
    const element =
      page.querySelector(selector);

    if (element instanceof HTMLElement) {
      element.textContent =
        value || "—";
    }
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

    if (contentElement instanceof HTMLElement) {
      contentElement.hidden = true;
    }
  }

  function showFeedback(
    message,
    isError = false
  ) {
    if (!(feedbackElement instanceof HTMLElement)) {
      return;
    }

    feedbackElement.textContent = message;
    feedbackElement.classList.toggle(
      "is-error",
      isError
    );
  }

  function getConversationStateLabel(state) {
    const labels = {
      activa: "Activa",
      pendiente_moderacion:
        "Pendiente de moderación",
      bloqueada: "Bloqueada",
      cerrada: "Cerrada"
    };

    return labels[state] || state;
  }

  function getRoleLabel(role) {
    const labels = {
      person: "Persona externa",
      student: "Estudiante COAR",
      staff: "Personal autorizado",
      admin: "Administrador"
    };

    return labels[role] || role || "Usuario";
  }

  function getParticipantLabel(participant) {
    if (!participant) {
      return "Usuario";
    }

    const profile =
      profileMap.get(
        participant.usuario_id
      );

    if (profile) {
      const fullName = [
        profile.nombres,
        profile.apellidos
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (fullName) {
        return fullName;
      }

      return getRoleLabel(
        profile.rol
      );
    }

    const fallback = {
      reportante: "Reportante",
      reclamante: "Reclamante",
      moderador: "Administrador"
    };

    return (
      fallback[participant.tipo] ||
      "Usuario"
    );
  }

  function getSenderLabel(senderId) {
    if (
      currentUser &&
      senderId === currentUser.id
    ) {
      return "Tú";
    }

    const participant =
      currentParticipants.find(
        (item) =>
          item.usuario_id === senderId
      );

    return getParticipantLabel(
      participant
    );
  }

  function formatMessageDate(value) {
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
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(date);
  }

  function scrollMessagesToBottom() {
    if (!(messageList instanceof HTMLElement)) {
      return;
    }

    messageList.scrollTop =
      messageList.scrollHeight;
  }

  function renderMessage(message) {
    if (!(messageList instanceof HTMLElement)) {
      return;
    }

    if (
      messageList.querySelector(
        `[data-message-id="${
          CSS.escape(
            String(message.id)
          )
        }"]`
      )
    ) {
      return;
    }

    if (emptyElement instanceof HTMLElement) {
      emptyElement.hidden = true;
    }

    const article =
      document.createElement("article");

    article.className =
      "hallazgo-chat__message";

    article.dataset.messageId =
      String(message.id);

    if (
      currentUser &&
      message.remitente_id ===
        currentUser.id
    ) {
      article.classList.add(
        "is-own"
      );
    }

    if (message.tipo === "sistema") {
      article.classList.add(
        "is-system"
      );
    }

    const meta =
      document.createElement("div");

    meta.className =
      "hallazgo-chat__message-meta";

    const sender =
      document.createElement("strong");

    sender.textContent =
      message.tipo === "sistema"
        ? "HallazGo"
        : getSenderLabel(
            message.remitente_id
          );

    const time =
      document.createElement("time");

    time.textContent =
      formatMessageDate(
        message.creado_en
      );

    meta.append(
      sender,
      time
    );

    const body =
      document.createElement("p");

    body.textContent =
      message.contenido;

    article.append(
      meta,
      body
    );

    messageList.appendChild(
      article
    );

    scrollMessagesToBottom();
  }

  function updateComposerState() {
    if (
      !currentConversation ||
      !currentUser
    ) {
      return;
    }

    const participant =
      currentParticipants.find(
        (item) =>
          item.usuario_id ===
          currentUser.id
      );

    let canWrite = false;
    let notice =
      "La conversación está disponible.";

    if (
      currentConversation.estado ===
        "activa" &&
      participant?.puede_escribir === true
    ) {
      canWrite = true;
      notice =
        "Conversación privada habilitada para coordinar la entrega.";
    }

    if (
      currentConversation.estado ===
        "pendiente_moderacion"
    ) {
      canWrite =
        participant?.tipo ===
          "moderador" &&
        participant
          ?.puede_escribir === true;

      notice =
        "Esta coordinación requiere intervención administrativa antes de habilitar mensajes entre los participantes.";
    }

    if (
      currentConversation.estado ===
        "bloqueada"
    ) {
      canWrite = false;
      notice =
        "La comunicación directa está bloqueada por las reglas de protección de HallazGo.";
    }

    if (
      currentConversation.estado ===
        "cerrada"
    ) {
      canWrite = false;
      notice =
        "La entrega ya fue cerrada. La conversación se conserva como registro.";
    }

    const noticeElement =
      page.querySelector(
        "[data-chat-notice]"
      );

    if (
      noticeElement instanceof
      HTMLElement
    ) {
      noticeElement.textContent =
        notice;

      noticeElement.dataset.state =
        currentConversation.estado;
    }

    setText(
      "[data-chat-state]",
      getConversationStateLabel(
        currentConversation.estado
      )
    );

    if (
      textarea instanceof
      HTMLTextAreaElement
    ) {
      textarea.disabled =
        !canWrite;
    }

    if (
      sendButton instanceof
      HTMLButtonElement
    ) {
      sendButton.disabled =
        !canWrite;
    }

    if (
      form instanceof
      HTMLFormElement
    ) {
      form.hidden =
        currentConversation.estado ===
          "cerrada";
    }

    if (
      closedElement instanceof
      HTMLElement
    ) {
      closedElement.hidden =
        currentConversation.estado !==
          "cerrada";
    }
  }

  async function loadProfiles() {
    const userIds =
      currentParticipants
        .map(
          (item) =>
            item.usuario_id
        )
        .filter(Boolean);

    if (userIds.length === 0) {
      return;
    }

    const {
      data,
      error
    } = await database
      .from("perfiles")
      .select(`
        id,
        nombres,
        apellidos,
        rol
      `)
      .in(
        "id",
        userIds
      );

    if (error) {
      console.warn(
        "No se pudieron cargar los nombres de los participantes:",
        error
      );

      return;
    }

    profileMap =
      new Map(
        (data || []).map(
          (profile) => [
            profile.id,
            profile
          ]
        )
      );
  }

  function renderParticipants() {
    const reportante =
      currentParticipants.find(
        (item) =>
          item.tipo ===
          "reportante"
      );

    const reclamante =
      currentParticipants.find(
        (item) =>
          item.tipo ===
          "reclamante"
      );

    const moderator =
      currentParticipants.find(
        (item) =>
          item.tipo ===
          "moderador"
      );

    setText(
      "[data-chat-reportante]",
      getParticipantLabel(
        reportante
      )
    );

    setText(
      "[data-chat-reclamante]",
      getParticipantLabel(
        reclamante
      )
    );

    if (
      moderatorCard instanceof
      HTMLElement
    ) {
      moderatorCard.hidden =
        !moderator;
    }

    if (moderator) {
      setText(
        "[data-chat-moderator]",
        getParticipantLabel(
          moderator
        )
      );
    }
  }

  async function loadMessages() {
    const {
      data,
      error
    } = await database
      .from("mensajes")
      .select(`
        id,
        conversacion_id,
        remitente_id,
        contenido,
        tipo,
        creado_en
      `)
      .eq(
        "conversacion_id",
        currentConversation.id
      )
      .order(
        "creado_en",
        {
          ascending: true
        }
      )
      .limit(200);

    if (error) {
      throw error;
    }

    if (
      emptyElement instanceof
      HTMLElement
    ) {
      emptyElement.hidden =
        (data || []).length > 0;
    }

    (data || []).forEach(
      renderMessage
    );

    scrollMessagesToBottom();
  }

  async function loadConversation(
    conversationId
  ) {
    const {
      data: conversation,
      error: conversationError
    } = await database
      .from("conversaciones")
      .select(`
        id,
        reclamacion_id,
        reporte_id,
        reportante_id,
        reclamante_id,
        estado,
        requiere_moderacion,
        moderador_id,
        ultimo_mensaje_en,
        creada_en,
        cerrada_en
      `)
      .eq(
        "id",
        conversationId
      )
      .single();

    if (
      conversationError ||
      !conversation
    ) {
      throw (
        conversationError ||
        new Error(
          "No se encontró la conversación."
        )
      );
    }

    currentConversation =
      conversation;

    const {
      data: participants,
      error: participantsError
    } = await database
      .from(
        "participantes_conversacion"
      )
      .select(`
        conversacion_id,
        usuario_id,
        tipo,
        puede_escribir,
        unido_en
      `)
      .eq(
        "conversacion_id",
        conversation.id
      );

    if (participantsError) {
      throw participantsError;
    }

    currentParticipants =
      participants || [];

    await loadProfiles();

    const {
      data: report,
      error: reportError
    } = await database
      .from("reportes")
      .select(`
        id,
        codigo,
        nombre_objeto,
        categoria,
        color,
        lugar_aproximado
      `)
      .eq(
        "id",
        conversation.reporte_id
      )
      .single();

    if (reportError) {
      console.warn(
        "No se pudo cargar el detalle del reporte:",
        reportError
      );
    } else {
      currentReport = report;
    }

    renderParticipants();

    setText(
      "[data-chat-report-code]",
      currentReport?.codigo ||
      "REPORTE"
    );

    setText(
      "[data-chat-object-name]",
      currentReport?.nombre_objeto ||
      "Objeto reportado"
    );

    const meta = [
      currentReport?.categoria,
      currentReport?.color,
      currentReport
        ?.lugar_aproximado
    ]
      .filter(Boolean)
      .join(" · ");

    setText(
      "[data-chat-object-meta]",
      meta ||
      "Información protegida del reporte"
    );

    updateComposerState();

    await loadMessages();
  }

  function subscribeRealtime() {
    if (
      !database ||
      !currentConversation
    ) {
      return;
    }

    realtimeChannel =
      database
        .channel(
          `hallazgo-chat-${
            currentConversation.id
          }`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "mensajes",
            filter:
              `conversacion_id=eq.${
                currentConversation.id
              }`
          },
          (payload) => {
            if (payload?.new) {
              renderMessage(
                payload.new
              );
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "conversaciones",
            filter:
              `id=eq.${
                currentConversation.id
              }`
          },
          (payload) => {
            if (!payload?.new) {
              return;
            }

            currentConversation = {
              ...currentConversation,
              ...payload.new
            };

            updateComposerState();
          }
        )
        .subscribe((status) => {
          if (
            status ===
            "CHANNEL_ERROR"
          ) {
            console.error(
              "No se pudo conectar el chat en tiempo real."
            );
          }
        });
  }

  function containsPhoneNumber(value) {
    const text =
      String(value || "");

    /*
     * Detecta principalmente números móviles peruanos:
     * 9 dígitos empezando en 9, con o sin +51 y separadores.
     */
    return /(?:\+?51[\s.-]*)?9(?:[\s.-]*[0-9]){8}/
      .test(text);
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (
      sending ||
      !(form instanceof HTMLFormElement) ||
      !(textarea instanceof HTMLTextAreaElement) ||
      !currentConversation ||
      !currentUser
    ) {
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const content =
      textarea.value.trim();

    if (!content) {
      return;
    }

    if (containsPhoneNumber(content)) {
      showFeedback(
        "Por seguridad, no compartas números telefónicos. Coordina la entrega dentro de HallazGo.",
        true
      );

      return;
    }

    sending = true;

    if (
      sendButton instanceof
      HTMLButtonElement
    ) {
      sendButton.disabled = true;
      sendButton.textContent =
        "Enviando...";
    }

    showFeedback(
      "Enviando mensaje..."
    );

    const {
      error
    } = await database
      .from("mensajes")
      .insert({
        conversacion_id:
          currentConversation.id,

        remitente_id:
          currentUser.id,

        contenido:
          content,

        tipo:
          "texto"
      });

    sending = false;

    if (error) {
      console.error(
        "No se pudo enviar el mensaje:",
        error
      );

      showFeedback(
        error.message ||
        "No se pudo enviar el mensaje.",
        true
      );

      updateComposerState();

      if (
        sendButton instanceof
        HTMLButtonElement &&
        !sendButton.disabled
      ) {
        sendButton.textContent =
          "Enviar";
      }

      return;
    }

    textarea.value = "";
    updateCharacterCount();

    showFeedback(
      ""
    );

    updateComposerState();

    if (
      sendButton instanceof
      HTMLButtonElement &&
      !sendButton.disabled
    ) {
      sendButton.textContent =
        "Enviar";
    }
  }

  function updateCharacterCount() {
    if (
      !(textarea instanceof
        HTMLTextAreaElement) ||
      !(countElement instanceof
        HTMLElement)
    ) {
      return;
    }

    countElement.textContent =
      `${textarea.value.length} / 1500`;
  }

  async function initialize() {
    database =
      window.HallazgoDB;

    if (!database) {
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

    const conversationId =
      params.get("id");

    if (!conversationId) {
      showStatus(
        "No se indicó qué conversación debe abrirse.",
        true
      );

      return;
    }

    const {
      data,
      error
    } = await database.auth
      .getUser();

    if (
      error ||
      !data.user
    ) {
      localStorage.setItem(
        "hallazgo_after_login",
        `chat.html?id=${
          encodeURIComponent(
            conversationId
          )
        }`
      );

      window.location.href =
        "seleccionar-rol.html";

      return;
    }

    currentUser =
      data.user;

    try {
      await loadConversation(
        conversationId
      );

      if (
        statusElement instanceof
        HTMLElement
      ) {
        statusElement.hidden = true;
      }

      if (
        contentElement instanceof
        HTMLElement
      ) {
        contentElement.hidden = false;
      }

      subscribeRealtime();
    } catch (loadError) {
      console.error(
        "No se pudo abrir el chat:",
        loadError
      );

      showStatus(
        "No se encontró la conversación o no tienes permiso para verla.",
        true
      );
    }
  }

  form?.addEventListener(
    "submit",
    sendMessage
  );

  textarea?.addEventListener(
    "input",
    updateCharacterCount
  );

  window.addEventListener(
    "beforeunload",
    () => {
      if (
        realtimeChannel &&
        typeof realtimeChannel
          .unsubscribe ===
          "function"
      ) {
        realtimeChannel.unsubscribe();
      }
    }
  );

  updateCharacterCount();
  initialize();
})();
