"use strict";

(() => {
  if (document.querySelector(".hallazgo-sidebar")) {
    return;
  }

  let currentPage =
    window.location.pathname
      .split("/")
      .pop()
      .toLowerCase() || "index.html";

  /*
   * La página de resultados pertenece
   * a la sección Buscar objetos.
   */
if (currentPage === "resultados-busqueda.html") {
  currentPage = "buscar-objetos.html";
}

if (
  currentPage === "revisar-reclamacion.html" ||
  currentPage === "chat.html"
) {
  currentPage = "notificaciones.html";
}

  const sidebar = document.createElement("aside");

  sidebar.className = "hallazgo-sidebar";

  sidebar.setAttribute(
    "aria-label",
    "Navegación lateral de HallazGo"
  );

  sidebar.innerHTML = `
    <a
      class="hallazgo-sidebar__logo"
      href="index.html"
      aria-label="HallazGo - Inicio"
      title="HallazGo"
    >
      H
    </a>

    <nav
      class="hallazgo-sidebar__nav"
      aria-label="Navegación principal"
    >

      <!-- INICIO -->

      <a
        class="hallazgo-sidebar__item"
        href="index.html"
        data-page="index.html"
        data-tooltip="Inicio"
        aria-label="Inicio"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5"></path>
          <path d="M5 9.5V21h14V9.5"></path>
          <path d="M9 21v-7h6v7"></path>
        </svg>
      </a>

      <!-- REPORTAR OBJETO -->

      <a
        class="hallazgo-sidebar__item"
        href="reportar-objeto.html"
        data-page="reportar-objeto.html"
        data-tooltip="Reportar objeto"
        aria-label="Reportar objeto"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 7.5 12 4l7 3.5-7 3.5-7-3.5Z"
          ></path>

          <path
            d="M5 7.5V16l7 4 7-4V7.5"
          ></path>

          <path d="M12 11v9"></path>
          <path d="M17.5 3v4"></path>
          <path d="M15.5 5h4"></path>
        </svg>
      </a>

      <!-- BUSCAR OBJETOS -->

      <a
        class="hallazgo-sidebar__item"
        href="buscar-objetos.html"
        data-page="buscar-objetos.html"
        data-tooltip="Buscar objetos"
        aria-label="Buscar objetos"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="10.5"
            cy="10.5"
            r="6.5"
          ></circle>

          <path d="m15.5 15.5 5 5"></path>
        </svg>
      </a>

      <!-- MIS REPORTES -->

      <a
        class="hallazgo-sidebar__item"
        href="mis-reportes.html"
        data-page="mis-reportes.html"
        data-tooltip="Mis reportes"
        aria-label="Mis reportes"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect
            x="5"
            y="4"
            width="14"
            height="17"
            rx="2"
          ></rect>

          <path d="M9 8h6"></path>
          <path d="M9 12h6"></path>
          <path d="M9 16h4"></path>
        </svg>
      </a>

      <!-- NOTIFICACIONES -->

      <a
        class="hallazgo-sidebar__item"
        href="notificaciones.html"
        data-page="notificaciones.html"
        data-tooltip="Notificaciones"
        aria-label="Notificaciones"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="
              M18 9
              A6 6 0 0 0 6 9
              C6 16 3 16 3 18
              H21
              C21 16 18 16 18 9
            "
          ></path>

          <path d="M10 21h4"></path>
        </svg>

        <span
          class="hallazgo-sidebar__badge"
          data-sidebar-notification-count
          hidden
        >
          0
        </span>
      </a>

      <!-- ÚNICO SEPARADOR -->

      <span
        class="hallazgo-sidebar__separator"
        aria-hidden="true"
      ></span>

      <!-- CÓMO FUNCIONA -->

      <a
        class="hallazgo-sidebar__item"
        href="como-funciona.html"
        data-page="como-funciona.html"
        data-tooltip="Cómo funciona"
        aria-label="Cómo funciona"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="9"
          ></circle>

          <path d="M12 11v6"></path>
          <path d="M12 7.5h.01"></path>
        </svg>
      </a>

    </nav>

    <!-- MI CUENTA -->

    <a
      class="
        hallazgo-sidebar__item
        hallazgo-sidebar__account
      "
      href="seleccionar-rol.html"
      data-tooltip="Mi cuenta"
      aria-label="Mi cuenta"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="8"
          r="4"
        ></circle>

        <path
          d="
            M4.5 21
            C4.5 16.5 7.5 14 12 14
            C16.5 14 19.5 16.5 19.5 21
          "
        ></path>
      </svg>
    </a>
  `;

  document.body.prepend(sidebar);

  sidebar
    .querySelectorAll("[data-page]")
    .forEach((link) => {
      if (link.dataset.page === currentPage) {
        link.classList.add("is-active");

        link.setAttribute(
          "aria-current",
          "page"
        );
      }
    });
})();