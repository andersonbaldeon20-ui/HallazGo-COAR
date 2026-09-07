"use strict";

/*
 * Desactiva el catálogo antiguo de app.js.
 */
window.HallazgoCatalogV2 = true;

(() => {
  const BUCKET_NAME = "reportes-archivos";
  const PAGE_SIZE = 6;

  const grid = document.querySelector(
    "[data-catalog-grid]"
  );

  if (!(grid instanceof HTMLElement)) {
    return;
  }

  const count = document.querySelector(
    "[data-catalog-count]"
  );

  const empty = document.querySelector(
    "[data-catalog-empty]"
  );

  const moreButton = document.querySelector(
    "[data-catalog-more]"
  );

  const detailsModal = document.querySelector(
    "[data-catalog-modal]"
  );

  const detailsContent = document.querySelector(
    "[data-catalog-modal-content]"
  );

  const detailsClose = document.querySelector(
    "[data-modal-close]"
  );

  const claimModal = document.querySelector(
    "[data-claim-modal]"
  );

  const claimClose = document.querySelector(
    "[data-claim-close]"
  );

  const claimForm = document.querySelector(
    "[data-claim-form]"
  );

  const claimFeedback = document.querySelector(
    "[data-claim-feedback]"
  );

  const claimReportInput = document.querySelector(
    "[data-claim-report-id]"
  );

  let currentUser = null;
  let allReports = [];
  let filteredReports = [];
  let currentLimit = PAGE_SIZE;

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

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function formatDate(value) {
    if (!value) {
      return "Fecha no registrada";
    }

    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
      return "Fecha no registrada";
    }

    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function getStatusLabel(status) {
    const labels = {
      publicado: "Encontrado",
      reclamado: "Con reclamación",
      en_revision: "En verificación",
      reservado: "Reservado",
      entregado: "Entregado",
      cerrado: "Cerrado"
    };

    return labels[status] || "Encontrado";
  }

  function getCategoryIcon(category) {
    const icons = {
      "Mochilas y loncheras": "🎒",
      "Casacas y ropa": "🧥",
      "Útiles escolares": "📚",
      "Botellas y tomatodos": "🧴",
      Lentes: "👓",
      Llaves: "🔑",
      "Dispositivos electrónicos": "📱",
      Otros: "⌕"
    };

    return icons[category] || "⌕";
  }

  async function createFileUrl(report) {
    if (!report.archivo_ruta) {
      return "";
    }

    const {
      data,
      error
    } = await window.HallazgoDB.storage
      .from(BUCKET_NAME)
      .createSignedUrl(
        report.archivo_ruta,
        60 * 60
      );

    if (error) {
      console.error(
        "No se pudo crear la URL del archivo:",
        error
      );

      return "";
    }

    return data?.signedUrl || "";
  }

  async function prepareReports(reports) {
    return Promise.all(
      reports.map(async (report) => ({
        ...report,
        archivo_url:
          await createFileUrl(report)
      }))
    );
  }

  function renderMedia(report) {
    if (
      report.archivo_url &&
      report.archivo_tipo?.startsWith("image/")
    ) {
      return `
        <img
          class="buscar-objetos__card-image"
          src="${escapeHtml(report.archivo_url)}"
          alt="Imagen referencial de ${escapeHtml(
            report.nombre_objeto
          )}"
          loading="lazy"
        >
      `;
    }

    if (
      report.archivo_url &&
      report.archivo_tipo === "application/pdf"
    ) {
      return `
        <div class="buscar-objetos__card-icon">
          PDF
        </div>
      `;
    }

    return `
      <div class="buscar-objetos__card-icon">
        ${getCategoryIcon(report.categoria)}
      </div>
    `;
  }

  function renderReports() {
    const visibleReports =
      filteredReports.slice(0, currentLimit);

    if (count instanceof HTMLElement) {
      count.hidden = false;

      count.textContent =
        `${filteredReports.length} coincidencia${
          filteredReports.length === 1
            ? ""
            : "s"
        }`;
    }

    if (!filteredReports.length) {
      grid.innerHTML = "";

      if (empty instanceof HTMLElement) {
        empty.hidden = false;
        empty.textContent =
          "No encontramos objetos que coincidan con los filtros.";
      }

      if (moreButton instanceof HTMLButtonElement) {
        moreButton.hidden = true;
      }

      return;
    }

    if (empty instanceof HTMLElement) {
      empty.hidden = true;
    }

    grid.innerHTML = visibleReports
      .map((report) => {
        const ownReport =
          currentUser?.id === report.creador_id;

        return `
          <article class="buscar-objetos__card">

            <div class="buscar-objetos__card-media">
              ${renderMedia(report)}
            </div>

            <div class="buscar-objetos__card-content">

              <p class="buscar-objetos__card-code">
                ${escapeHtml(report.codigo)}
              </p>

              <h2 class="buscar-objetos__card-title">
                ${escapeHtml(report.nombre_objeto)}
              </h2>

              <div class="buscar-objetos__card-tags">

                <span class="buscar-objetos__tag">
                  ${escapeHtml(report.categoria)}
                </span>

                <span class="buscar-objetos__tag">
                  ${escapeHtml(report.color)}
                </span>

                <span class="buscar-objetos__tag">
                  ${escapeHtml(
                    report.lugar_aproximado
                  )}
                </span>

              </div>

              <p class="buscar-objetos__card-date">
                Encontrado:
                ${formatDate(
                  report.fecha_aproximada
                )}
              </p>

              <p class="buscar-objetos__card-status">
                ${escapeHtml(
                  getStatusLabel(report.estado)
                )}
              </p>

              <div class="buscar-objetos__card-actions">

                <button
                  class="buscar-objetos__card-button"
                  type="button"
                  data-view-object="${escapeHtml(
                    report.id
                  )}"
                >
                  Ver detalles
                </button>

                <button
                  class="
                    buscar-objetos__card-button
                    buscar-objetos__card-button--claim
                  "
                  type="button"
                  data-claim-object="${escapeHtml(
                    report.id
                  )}"
                  ${ownReport ? "disabled" : ""}
                >
                  ${
                    ownReport
                      ? "Tu reporte"
                      : "Este objeto es mío"
                  }
                </button>

              </div>

            </div>

          </article>
        `;
      })
      .join("");

    if (moreButton instanceof HTMLButtonElement) {
      moreButton.hidden =
        filteredReports.length <= currentLimit;
    }
  }

  function applyUrlFilters() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const search = normalize(
      params.get("q")
    );

    const category = normalize(
      params.get("categoria")
    );

    const color = normalize(
      params.get("color")
    );

    const location = normalize(
      params.get("lugar")
    );

    const status = normalize(
      params.get("estado")
    );

    filteredReports = allReports.filter(
      (report) => {
        const combinedText = normalize(`
          ${report.nombre_objeto}
          ${report.categoria}
          ${report.color}
          ${report.lugar_aproximado}
          ${report.descripcion_publica}
          ${report.marca || ""}
        `);

        const matchesSearch =
          !search ||
          combinedText.includes(search);

        const matchesCategory =
          !category ||
          normalize(report.categoria) ===
            category;

        const matchesColor =
          !color ||
          normalize(report.color) === color;

        const matchesLocation =
          !location ||
          normalize(
            report.lugar_aproximado
          ).includes(location);

        let matchesStatus = true;

        if (status === "en verificacion") {
          matchesStatus = [
            "reclamado",
            "en_revision"
          ].includes(report.estado);
        }

        if (status === "encontrado") {
          matchesStatus = [
            "publicado",
            "reclamado",
            "en_revision"
          ].includes(report.estado);
        }

        return (
          matchesSearch &&
          matchesCategory &&
          matchesColor &&
          matchesLocation &&
          matchesStatus
        );
      }
    );

    currentLimit = PAGE_SIZE;
    renderReports();
  }

  function openDetails(reportId) {
    const report = allReports.find(
      (item) => item.id === reportId
    );

    if (
      !report ||
      !(detailsModal instanceof HTMLDialogElement) ||
      !(detailsContent instanceof HTMLElement)
    ) {
      return;
    }

    const fileButton =
      report.archivo_url
        ? `
          <a
            class="buscar-objetos__card-button"
            href="${escapeHtml(
              report.archivo_url
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver archivo
          </a>
        `
        : "";

    detailsContent.innerHTML = `
      <p class="buscar-objetos__card-code">
        ${escapeHtml(report.codigo)}
      </p>

      <h2>
        ${escapeHtml(report.nombre_objeto)}
      </h2>

      <p class="buscar-objetos__modal-text">
        Esta publicación solo contiene información
        general y no revela datos de verificación.
      </p>

      <div class="buscar-objetos__detail-grid">

        <div class="buscar-objetos__detail-item">
          <strong>Categoría</strong>
          ${escapeHtml(report.categoria)}
        </div>

        <div class="buscar-objetos__detail-item">
          <strong>Color</strong>
          ${escapeHtml(report.color)}
        </div>

        <div class="buscar-objetos__detail-item">
          <strong>Lugar aproximado</strong>
          ${escapeHtml(
            report.lugar_aproximado
          )}
        </div>

        <div class="buscar-objetos__detail-item">
          <strong>Fecha</strong>
          ${formatDate(
            report.fecha_aproximada
          )}
        </div>

        <div class="buscar-objetos__detail-item">
          <strong>Estado</strong>
          ${escapeHtml(
            getStatusLabel(report.estado)
          )}
        </div>

        <div class="buscar-objetos__detail-item">
          <strong>Descripción pública</strong>
          ${escapeHtml(
            report.descripcion_publica
          )}
        </div>

      </div>

      ${fileButton}
    `;

    detailsModal.showModal();
  }

  function clearClaimFeedback() {
    if (!(claimFeedback instanceof HTMLElement)) {
      return;
    }

    claimFeedback.textContent = "";
    claimFeedback.classList.remove(
      "is-error",
      "is-success"
    );
  }

  function showClaimFeedback(
    message,
    isError = false
  ) {
    if (!(claimFeedback instanceof HTMLElement)) {
      return;
    }

    claimFeedback.textContent = message;

    claimFeedback.classList.toggle(
      "is-error",
      isError
    );

    claimFeedback.classList.toggle(
      "is-success",
      !isError
    );
  }

  function openClaim(reportId) {
    const report = allReports.find(
      (item) => item.id === reportId
    );

    if (
      !report ||
      !(claimModal instanceof HTMLDialogElement) ||
      !(claimForm instanceof HTMLFormElement) ||
      !(claimReportInput instanceof HTMLInputElement)
    ) {
      return;
    }

    if (report.creador_id === currentUser?.id) {
      return;
    }

    claimForm.reset();
    clearClaimFeedback();

    claimReportInput.value = report.id;

    const objectName =
      claimModal.querySelector(
        "[data-claim-object-name]"
      );

    if (objectName instanceof HTMLElement) {
      objectName.textContent =
        report.nombre_objeto;
    }

    claimModal.showModal();
  }

  function translateClaimError(error) {
    const message = String(
      error?.message || ""
    );

    if (
      message.includes(
        "No puedes reclamar un objeto"
      )
    ) {
      return (
        "No puedes reclamar un objeto " +
        "que tú mismo reportaste."
      );
    }

    if (
      message.includes(
        "Ya tienes una reclamación activa"
      )
    ) {
      return (
        "Ya tienes una reclamación activa " +
        "para este objeto."
      );
    }

    if (
      message.includes(
        "límite de intentos"
      )
    ) {
      return (
        "Alcanzaste el límite de intentos " +
        "para este objeto durante 24 horas."
      );
    }

    if (
      message.includes(
        "dos datos privados"
      )
    ) {
      return (
        "Debes completar al menos dos datos " +
        "privados de verificación."
      );
    }

    if (
      message.includes(
        "No compartas teléfonos"
      )
    ) {
      return (
        "No compartas teléfonos, correos, " +
        "enlaces ni redes sociales."
      );
    }

    return (
      message ||
      "No se pudo enviar la reclamación."
    );
  }

  async function submitClaim(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (
      !(claimForm instanceof HTMLFormElement) ||
      !(claimReportInput instanceof HTMLInputElement)
    ) {
      return;
    }

    if (!claimForm.checkValidity()) {
      claimForm.reportValidity();
      return;
    }

    const formData =
      new FormData(claimForm);

    const privateEvidence = [
      formData.get("marcaIniciales"),
      formData.get("contenidoAccesorios"),
      formData.get("detalleParticular"),
      formData.get("lugarPerdida"),
      formData.get("fechaPerdida")
    ].filter((value) =>
      String(value || "").trim()
    );

    if (privateEvidence.length < 2) {
      showClaimFeedback(
        "Completa al menos dos datos privados de verificación.",
        true
      );

      return;
    }

    const submitButton =
      claimForm.querySelector(
        'button[type="submit"]'
      );

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent =
        "Enviando reclamación...";
    }

    clearClaimFeedback();

    try {
      const {
        data: userData,
        error: userError
      } = await window.HallazgoDB.auth.getUser();

      if (userError || !userData.user) {
        throw new Error(
          "Tu sesión no está activa. Inicia sesión nuevamente."
        );
      }

      const claimData = {
        reporte_id:
          claimReportInput.value,

        reclamante_id:
          userData.user.id,

        descripcion_detallada:
          String(
            formData.get(
              "descripcionDetallada"
            ) || ""
          ).trim(),

        marca_iniciales:
          String(
            formData.get(
              "marcaIniciales"
            ) || ""
          ).trim() || null,

        contenido_accesorios:
          String(
            formData.get(
              "contenidoAccesorios"
            ) || ""
          ).trim() || null,

        detalle_particular:
          String(
            formData.get(
              "detalleParticular"
            ) || ""
          ).trim() || null,

        lugar_perdida:
          String(
            formData.get(
              "lugarPerdida"
            ) || ""
          ).trim() || null,

        fecha_perdida:
          String(
            formData.get(
              "fechaPerdida"
            ) || ""
          ).trim() || null
      };

      const {
        data,
        error
      } = await window.HallazgoDB
        .from("reclamaciones")
        .insert(claimData)
        .select("id, codigo, estado")
        .single();

      if (error) {
        throw error;
      }

      showClaimFeedback(
        `Reclamación ${data.codigo} enviada. ` +
        "El reportante deberá comparar tu descripción " +
        "con el objeto físico. El chat continúa bloqueado."
      );

      claimForm.reset();
      claimReportInput.value =
        claimData.reporte_id;

      await loadReports();
    } catch (error) {
      console.error(
        "No se pudo enviar la reclamación:",
        error
      );

      showClaimFeedback(
        translateClaimError(error),
        true
      );
    } finally {
      if (
        submitButton instanceof HTMLButtonElement
      ) {
        submitButton.disabled = false;
        submitButton.textContent =
          "Enviar reclamación";
      }
    }
  }

  async function loadReports() {
    if (!window.HallazgoDB) {
      if (empty instanceof HTMLElement) {
        empty.hidden = false;
        empty.textContent =
          "No se pudo conectar con Supabase.";
      }

      return;
    }

    const {
      data: userData,
      error: userError
    } = await window.HallazgoDB.auth.getUser();

    if (userError || !userData.user) {
      localStorage.setItem(
        "hallazgo_after_login",
        `${window.location.pathname
          .split("/")
          .pop()}${window.location.search}`
      );

      window.location.href =
        "seleccionar-rol.html";

      return;
    }

    currentUser = userData.user;

    const {
      data,
      error
    } = await window.HallazgoDB
      .from("reportes")
      .select(`
        id,
        codigo,
        creador_id,
        nombre_objeto,
        categoria,
        color,
        marca,
        fecha_aproximada,
        lugar_aproximado,
        descripcion_publica,
        archivo_ruta,
        archivo_nombre,
        archivo_tipo,
        estado,
        creado_en
      `)
      .in(
        "estado",
        [
          "publicado",
          "reclamado",
          "en_revision"
        ]
      )
      .order(
        "creado_en",
        {
          ascending: false
        }
      );

    if (error) {
      console.error(
        "No se pudieron cargar los reportes:",
        error
      );

      if (empty instanceof HTMLElement) {
        empty.hidden = false;
        empty.textContent =
          "No se pudieron cargar los objetos.";
      }

      return;
    }

    allReports =
      await prepareReports(data || []);

    applyUrlFilters();
  }

  grid.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const detailButton =
        event.target.closest(
          "[data-view-object]"
        );

      const claimButton =
        event.target.closest(
          "[data-claim-object]"
        );

      if (
        detailButton instanceof HTMLButtonElement
      ) {
        openDetails(
          detailButton.dataset.viewObject || ""
        );
      }

      if (
        claimButton instanceof HTMLButtonElement &&
        !claimButton.disabled
      ) {
        openClaim(
          claimButton.dataset.claimObject || ""
        );
      }
    }
  );

  detailsClose?.addEventListener(
    "click",
    () => {
      if (
        detailsModal instanceof HTMLDialogElement
      ) {
        detailsModal.close();
      }
    }
  );

  claimClose?.addEventListener(
    "click",
    () => {
      if (
        claimModal instanceof HTMLDialogElement
      ) {
        claimModal.close();
      }
    }
  );

  moreButton?.addEventListener(
    "click",
    () => {
      currentLimit += PAGE_SIZE;
      renderReports();
    }
  );

  claimForm?.addEventListener(
    "submit",
    submitClaim,
    true
  );

  loadReports();
})();