"use strict";

/*
 * Impide que el módulo antiguo de app.js
 * vuelva a mostrar reportes desde localStorage.
 */
window.HallazgoReportsV2 = true;

(() => {
  const BUCKET_NAME = "reportes-archivos";

  const section = document.querySelector(
    "[data-mis-reportes-section]"
  );

  if (!(section instanceof HTMLElement)) {
    return;
  }

  /*
   * app.js comprueba este atributo.
   * Al dejarlo en true, evitamos que ejecute
   * el renderizado antiguo de localStorage.
   */
  section.dataset.ready = "true";

  const total = section.querySelector(
    "[data-mis-reportes-total]"
  );

  const empty = section.querySelector(
    "[data-mis-reportes-empty]"
  );

  const list = section.querySelector(
    "[data-mis-reportes-list]"
  );

  if (
    !(total instanceof HTMLElement) ||
    !(empty instanceof HTMLElement) ||
    !(list instanceof HTMLElement)
  ) {
    return;
  }

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
      return "Sin fecha registrada";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Sin fecha registrada";
    }

    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function normalizeStatus(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");
  }

  function getStatusLabel(status) {
    const labels = {
      publicado: "Publicado",
      reclamado: "Reclamado",
      en_revision: "En revisión",
      reservado: "Reservado",
      entregado: "Entregado",
      cerrado: "Cerrado"
    };

    return labels[status] || "Publicado";
  }

  function getAction(status) {
    if (status === "reclamado") {
      return `
        <button
          class="mis-reportes__accion"
          type="button"
          disabled
        >
          Reclamación recibida
        </button>
      `;
    }

    if (status === "en_revision") {
      return `
        <button
          class="mis-reportes__accion"
          type="button"
          disabled
        >
          Reclamación en revisión
        </button>
      `;
    }

    if (status === "reservado") {
      return `
        <button
          class="mis-reportes__accion"
          type="button"
          disabled
        >
          Entrega en coordinación
        </button>
      `;
    }

    if (status === "entregado") {
      return `
        <button
          class="mis-reportes__accion"
          type="button"
          disabled
        >
          Objeto entregado
        </button>
      `;
    }

    if (status === "cerrado") {
      return `
        <button
          class="mis-reportes__accion"
          type="button"
          disabled
        >
          Reporte cerrado
        </button>
      `;
    }

    return `
      <button
        class="mis-reportes__accion"
        type="button"
        disabled
      >
        Esperando reclamación
      </button>
    `;
  }

  async function getTemporaryFileUrl(report) {
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
        "No se pudo generar el enlace del archivo:",
        error
      );

      return "";
    }

    return data?.signedUrl || "";
  }

  async function prepareReports(reports) {
    return Promise.all(
      reports.map(async (report) => {
        return {
          ...report,
          archivo_url:
            await getTemporaryFileUrl(report)
        };
      })
    );
  }

  function renderFile(report) {
    const url = report.archivo_url;

    if (!url) {
      return `
        <div
          class="mis-reportes__sin-foto"
          aria-hidden="true"
        >
          ⌕
        </div>
      `;
    }

    if (report.archivo_tipo === "application/pdf") {
      return `
        <a
          class="mis-reportes__sin-foto"
          href="${escapeHtml(url)}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir PDF de ${escapeHtml(
            report.nombre_objeto
          )}"
        >
          PDF
        </a>
      `;
    }

    return `
      <img
        class="mis-reportes__foto"
        src="${escapeHtml(url)}"
        alt="Archivo referencial de ${escapeHtml(
          report.nombre_objeto
        )}"
        loading="lazy"
      >
    `;
  }

  function renderReports(reports) {
    total.textContent = String(reports.length);

    if (!reports.length) {
      empty.hidden = false;
      empty.textContent =
        "Todavía no has registrado objetos encontrados.";

      list.hidden = true;
      list.innerHTML = "";

      return;
    }

    empty.hidden = true;
    list.hidden = false;

    list.innerHTML = reports
      .map((report) => {
        const status =
          report.estado || "publicado";

        const statusLabel =
          getStatusLabel(status);

        const statusClass =
          normalizeStatus(status);

        return `
          <article class="mis-reportes__tarjeta">

            ${renderFile(report)}

            <div class="mis-reportes__contenido">

              <div class="mis-reportes__cabecera-tarjeta">

                <div>
                  <p class="mis-reportes__codigo">
                    ${escapeHtml(report.codigo)}
                  </p>

                  <h2 class="mis-reportes__titulo">
                    ${escapeHtml(
                      report.nombre_objeto
                    )}
                  </h2>
                </div>

                <span
                  class="
                    mis-reportes__estado
                    mis-reportes__estado--${statusClass}
                  "
                >
                  ${escapeHtml(statusLabel)}
                </span>

              </div>

              <div class="mis-reportes__datos">

                <span class="mis-reportes__dato">
                  Objeto encontrado
                </span>

                <span class="mis-reportes__dato">
                  ${escapeHtml(report.categoria)}
                </span>

                <span class="mis-reportes__dato">
                  ${escapeHtml(report.color)}
                </span>

                <span class="mis-reportes__dato">
                  ${escapeHtml(
                    report.lugar_aproximado
                  )}
                </span>

              </div>

              <p class="mis-reportes__descripcion">
                ${escapeHtml(
                  report.descripcion_publica
                )}
              </p>

              <div class="mis-reportes__pie">

                <span class="mis-reportes__fecha">
                  Registrado:
                  ${formatDate(report.creado_en)}
                </span>

                ${getAction(status)}

              </div>

            </div>

          </article>
        `;
      })
      .join("");
  }

  function showLoading() {
    total.textContent = "0";

    empty.hidden = false;
    empty.textContent =
      "Cargando tus reportes...";

    list.hidden = true;
    list.innerHTML = "";
  }

  function showError(message) {
    total.textContent = "0";

    empty.hidden = false;
    empty.textContent = message;

    list.hidden = true;
    list.innerHTML = "";
  }

  async function loadMyReports() {
    showLoading();

    if (!window.HallazgoDB) {
      showError(
        "No se pudo conectar con Supabase."
      );

      return;
    }

    const {
      data: userData,
      error: userError
    } = await window.HallazgoDB.auth.getUser();

    if (userError || !userData.user) {
      localStorage.setItem(
        "hallazgo_after_login",
        "mis-reportes.html"
      );

      window.location.href =
        "seleccionar-rol.html";

      return;
    }

    const {
      data: reports,
      error: reportsError
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
        creado_en,
        actualizado_en
      `)
      .eq(
        "creador_id",
        userData.user.id
      )
      .order(
        "creado_en",
        {
          ascending: false
        }
      );

    if (reportsError) {
      console.error(
        "No se pudieron consultar los reportes:",
        reportsError
      );

      showError(
        "No se pudieron cargar tus reportes."
      );

      return;
    }

    const preparedReports =
      await prepareReports(reports || []);

    renderReports(preparedReports);
  }

  loadMyReports();
})();