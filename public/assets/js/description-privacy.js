"use strict";

(() => {
  const form = document.querySelector(
    "[data-encuentracoar-report-form]"
  );

  const descriptionField = document.querySelector(
    '#objeto-descripcion[name="description"]'
  );

  const feedback = document.querySelector(
    "[data-description-privacy-feedback]"
  );

  if (!form || !descriptionField || !feedback) {
    return;
  }

  const MINIMUM_LENGTH = 15;

  const REVEALING_PATTERNS = [
    {
      name: "correo electrónico",
      regex:
        /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i
    },
    {
      name: "número telefónico",
      regex:
        /(?:\+?51[\s.-]?)?(?:9\d{8}|\d{3}[\s.-]\d{3}[\s.-]\d{3})/
    },
    {
      name: "iniciales",
      regex:
        /\b(?:iniciales?|letras?)\b.{0,30}\b[a-z](?:[\s.\-]*[a-z]){1,5}\b/i
    },
    {
      name: "iniciales escritas directamente",
      regex:
        /\b(?:[A-ZÁÉÍÓÚÑ]\s*[.\-]\s*){1,4}[A-ZÁÉÍÓÚÑ]\b/
    },
    {
      name: "nombre identificador",
      regex:
        /\b(?:nombre|apellido)\b.{0,40}\b(?:escrito|grabado|bordado|marcado|pegado|impreso)\b/i
    },
    {
      name: "nombre escrito",
      regex:
        /\b(?:tiene escrito|está escrito|esta escrito|dice)\b.{0,40}\b(?:nombre|apellido|iniciales)\b/i
    },
    {
      name: "contenido del objeto",
      regex:
        /\b(?:contenía|contenia|contiene|tenía dentro|tenia dentro|había dentro|habia dentro|guardaba|lleva dentro|tenía guardado|tenia guardado)\b/i
    },
    {
      name: "detalle interior",
      regex:
        /\b(?:dentro|interior)\b.{0,45}\b(?:cuaderno|calculadora|llave|dinero|tarjeta|documento|lapicero|cargador|audífonos|audifonos|libro|foto|fotografía|fotografia)\b/i
    },
    {
      name: "característica oculta",
      regex:
        /\b(?:oculto|oculta|escondido|escondida|debajo de|parte interna|bolsillo interior|interior del bolsillo|detrás de la etiqueta|detras de la etiqueta)\b/i
    },
    {
      name: "código privado",
      regex:
        /\b(?:código|codigo|clave|contraseña|contrasena|pin)\b.{0,30}\b[a-z0-9-]{3,}\b/i
    },
    {
      name: "número de serie",
      regex:
        /\b(?:número de serie|numero de serie|serial)\b.{0,35}\b[a-z0-9-]{3,}\b/i
    },
    {
      name: "etiqueta identificadora",
      regex:
        /\b(?:etiqueta|inscripción|inscripcion|firma|dedicatoria|grabado)\b.{0,45}\b(?:nombre|apellido|iniciales|letras|número|numero|código|codigo)\b/i
    },
    {
      name: "red social o enlace",
      regex:
        /\b(?:https?:\/\/|www\.|instagram|facebook|tiktok|whatsapp|wa\.me)\b/i
    }
  ];

  function normalizeText(value) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function analyzeDescription(value) {
    const originalText = value.trim();
    const normalizedText = normalizeText(originalText);

    const detectedPatterns = REVEALING_PATTERNS.filter(
      (pattern) => pattern.regex.test(originalText)
    );

    return {
      empty: normalizedText.length === 0,
      tooShort: normalizedText.length < MINIMUM_LENGTH,
      tooRevealing: detectedPatterns.length > 0,
      detectedPatterns
    };
  }

  function hideFeedback() {
    feedback.hidden = true;
    feedback.textContent = "";
    feedback.classList.remove(
      "is-error",
      "is-warning"
    );

    descriptionField.removeAttribute("aria-invalid");
  }

  function showFeedback(message) {
    feedback.innerHTML = message;
    feedback.hidden = false;
    feedback.classList.add("is-error");

    descriptionField.setAttribute(
      "aria-invalid",
      "true"
    );

    descriptionField.focus();

    feedback.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function validateDescription(event) {
    const result = analyzeDescription(
      descriptionField.value
    );

    if (result.empty || result.tooShort) {
      event.preventDefault();
      event.stopImmediatePropagation();

      showFeedback(`
        <strong>
          La descripción necesita ser más descriptiva.
        </strong>

        <p>
          Describe el estado general del objeto, por ejemplo
          si está sucio, roto, desgastado, rayado, doblado
          o deteriorado.
        </p>
      `);

      return false;
    }

    if (result.tooRevealing) {
      event.preventDefault();
      event.stopImmediatePropagation();

      showFeedback(`
        <strong>
          La descripción contiene información demasiado significativa.
        </strong>

        <p>
          Describe el estado general del objeto. Evita nombres,
          iniciales, contenido, códigos o detalles que permitan
          reclamarlo.
        </p>
      `);

      return false;
    }

    hideFeedback();
    return true;
  }

  descriptionField.addEventListener("input", () => {
    hideFeedback();
  });

  /*
   * Se usa la fase de captura para revisar la descripción
   * antes de que app.js procese y guarde el reporte.
   */
  form.addEventListener(
    "submit",
    validateDescription,
    true
  );
})();