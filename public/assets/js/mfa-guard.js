"use strict";

(() => {
  async function protectPage() {
    const database = window.HallazgoDB;
    if (!database) return;
    const currentPage = `${window.location.pathname.split("/").pop() || "index.html"}${window.location.search}`;

    const { data: sessionData, error: sessionError } =
      await database.auth.getSession();

    if (sessionError || !sessionData.session) {
      localStorage.setItem("hallazgo_after_login", currentPage);
      window.location.replace("seleccionar-rol.html");
      return;
    }

    const { data: assurance, error: assuranceError } =
      await database.auth.mfa.getAuthenticatorAssuranceLevel();

    if (assuranceError) {
      console.error("No se pudo comprobar AAL2:", assuranceError);
      window.location.replace("seleccionar-rol.html");
      return;
    }

    if (assurance.currentLevel === "aal2") return;

    const user = sessionData.session.user;
    const { data: profile } = await database
      .from("perfiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      sessionStorage.setItem("hallazgo_pending_mfa_user", JSON.stringify({
        authUser: { id: user.id, email: user.email || "" },
        profile
      }));
    }

    localStorage.setItem(
      "hallazgo_after_mfa",
      currentPage
    );
    window.location.replace("seguridad-cuenta.html?mode=challenge");
  }

  protectPage().catch((error) => {
    console.error("No se pudo proteger la página:", error);
    window.location.replace("seleccionar-rol.html");
  });
})();
