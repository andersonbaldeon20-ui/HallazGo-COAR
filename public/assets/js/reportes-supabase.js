"use strict";

/*
 * Informa a app.js que el formulario ya será
 * administrado por Supabase.
 */
window.HallazgoReportsV2 = true;

(() => {
  const BUCKET_NAME = "reportes-archivos";
  const MAX_FILE_BYTES = 1024 * 1024;

  const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
  ];

  const form = document.querySelector(
    "[data-encuentracoar-report-form]"
  );

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const feedback = form.querySelector(
    "[data-report-feedback]"
  );

  const submitButton = form.querySelector(
    "[data-report-submit]"
  );

  const fileInput = form.querySelector(
    'input[name="photo"]'
  );

  function showFeedback(message, isError = false) {
    if (!(feedback instanceof HTMLElement)) {
      return;
    }

    feedback.hidden = false;
    feedback.textContent = message;

    feedback.style.marginBottom = "16px";
    feedback.style.padding = "14px 16px";
    feedback.style.borderRadius = "0";
    feedback.style.fontWeight = "600";

    if (isError) {
      feedback.style.background = "#0a0a0a";
      feedback.style.color = "#fafafa";
      feedback.style.border = "1px solid #0a0a0a";
    } else {
      feedback.style.background = "rgba(10, 10, 10, 0.06)";
      feedback.style.color = "#0a0a0a";
      feedback.style.border = "1px solid rgba(10, 10, 10, 0.35)";
    }

    feedback.focus();
  }

  function createUUID() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    return (
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
    ).replace(/[xy]/g, (character) => {
      const random = Math.floor(
        Math.random() * 16
      );

      const value =
        character === "x"
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    });
  }

  function cleanFileName(fileName) {
    const normalizedName = String(
      fileName || "archivo"
    )
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return normalizedName || "archivo";
  }

  function validateFile(file) {
    if (!file) {
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(
        "El archivo debe ser JPG, JPEG, PNG, WEBP o PDF."
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      throw new Error(
        "El archivo no puede superar 1 MB."
      );
    }
  }

  async function uploadReportFile(
    file,
    userId,
    reportId
  ) {
    if (!file) {
      return null;
    }

    validateFile(file);

    const safeFileName = cleanFileName(
      file.name
    );

    const filePath = [
      userId,
      reportId,
      `${Date.now()}-${safeFileName}`
    ].join("/");

    const {
      data: uploadData,
      error: uploadError
    } = await window.HallazgoDB.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error(
        "Error al subir el archivo:",
        uploadError
      );

      throw new Error(
        "No se pudo subir el archivo seleccionado."
      );
    }

    return {
      path: uploadData.path,
      name: file.name,
      type: file.type
    };
  }

  async function removeUploadedFile(filePath) {
    if (!filePath) {
      return;
    }

    const { error } =
      await window.HallazgoDB.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

    if (error) {
      console.error(
        "No se pudo limpiar el archivo:",
        error
      );
    }
  }

  function translateDatabaseError(error) {
    if (!error) {
      return "No se pudo guardar el reporte.";
    }

    if (error.code === "23514") {
      return (
        "La descripción contiene información " +
        "demasiado significativa. Describe el " +
        "estado general del objeto. Evita nombres, " +
        "iniciales, contenido, códigos o detalles " +
        "que permitan reclamarlo."
      );
    }

    if (error.code === "42501") {
      return (
        "No tienes autorización para registrar " +
        "este reporte. Inicia sesión nuevamente."
      );
    }

    return (
      error.message ||
      "No se pudo guardar el reporte."
    );
  }

  async function handleReportSubmit(event) {
    /*
     * Impide que el módulo antiguo de app.js
     * guarde el reporte en localStorage.
     */
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!window.HallazgoDB) {
      showFeedback(
        "No se pudo conectar con Supabase. Recarga la página.",
        true
      );

      return;
    }

    if (!form.checkValidity()) {
      showFeedback(
        "Completa todos los campos obligatorios marcados con *.",
        true
      );

      const firstInvalid =
        form.querySelector(":invalid");

      if (firstInvalid instanceof HTMLElement) {
        firstInvalid.focus();
      }

      return;
    }

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent =
        "Guardando reporte...";
    }

    let uploadedFile = null;

    try {
      /*
       * Comprueba la cuenta directamente con
       * Supabase Auth.
       */
      const {
        data: userData,
        error: userError
      } = await window.HallazgoDB.auth.getUser();

      if (userError || !userData.user) {
        localStorage.setItem(
          "hallazgo_after_login",
          "reportar-objeto.html"
        );

        throw new Error(
          "Tu sesión no está activa. Inicia sesión nuevamente."
        );
      }

      const user = userData.user;
      const reportId = createUUID();
      const formData = new FormData(form);

      const selectedFile =
        fileInput instanceof HTMLInputElement
          ? fileInput.files?.[0] || null
          : null;

      uploadedFile = await uploadReportFile(
        selectedFile,
        user.id,
        reportId
      );

      const reportData = {
        id: reportId,

        creador_id: user.id,

        tipo: "encontrado",

        nombre_objeto: String(
          formData.get("objectName") || ""
        ).trim(),

        categoria: String(
          formData.get("category") || ""
        ).trim(),

        color: String(
          formData.get("color") || ""
        ).trim(),

        marca:
          String(
            formData.get("brand") || ""
          ).trim() || null,

        fecha_aproximada: String(
          formData.get("approximateDate") || ""
        ).trim(),

        lugar_aproximado: String(
          formData.get("location") || ""
        ).trim(),

        descripcion_publica: String(
          formData.get("description") || ""
        ).trim(),

        archivo_ruta:
          uploadedFile?.path || null,

        archivo_nombre:
          uploadedFile?.name || null,

        archivo_tipo:
          uploadedFile?.type || null,

        estado: "publicado"
      };

      const {
        data: savedReport,
        error: insertError
      } = await window.HallazgoDB
        .from("reportes")
        .insert(reportData)
        .select("id, codigo")
        .single();

      if (insertError) {
        await removeUploadedFile(
          uploadedFile?.path
        );

        uploadedFile = null;

        console.error(
          "Error al insertar el reporte:",
          insertError
        );

        throw new Error(
          translateDatabaseError(insertError)
        );
      }

      form.reset();

      window.dispatchEvent(
        new CustomEvent(
          "hallazgo:reporte-guardado",
          {
            detail: savedReport
          }
        )
      );

      showFeedback(
        `Reporte ${savedReport.codigo} registrado correctamente.`
      );
    } catch (error) {
      console.error(
        "No se pudo registrar el reporte:",
        error
      );

      showFeedback(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el reporte.",
        true
      );
    } finally {
      if (
        submitButton instanceof HTMLButtonElement
      ) {
        submitButton.disabled = false;
        submitButton.textContent =
          "Enviar reporte";
      }
    }
  }

  form.addEventListener(
    "submit",
    handleReportSubmit,
    true
  );
})();