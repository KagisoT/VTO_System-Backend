import customtkinter as ctk


from session import Session


class Profile(ctk.CTkFrame):

    def __init__(self, master):

        super().__init__(master)

        self.pack(fill="both", expand=True)

        self.build()

    def build(self):

        top = ctk.CTkFrame(self)

        top.pack(fill="x")

        ctk.CTkButton(
            top,
            text="← Dashboard",
            command=self.back
        ).pack(side="left", padx=20, pady=15)

        body = ctk.CTkFrame(self)

        body.pack(fill="both", expand=True, padx=20, pady=20)

        user = Session.user or {}

        ctk.CTkLabel(
            body,
            text="Profile",
            font=("Segoe UI", 30, "bold")
        ).pack(anchor="w")

        self.item(body, "Username", user.get("username", "Collector"))
        self.item(body, "Name", user.get("fullName", "Collector"))
        self.item(body, "Role", user.get("role", "Collector"))

        ctk.CTkButton(
            body,
            text="Logout",
            fg_color="red",
            hover_color="#b91c1c",
            command=self.logout
        ).pack(pady=40)

    def item(self, parent, title, value):

        frame = ctk.CTkFrame(parent)

        frame.pack(fill="x", pady=10)

        ctk.CTkLabel(
            frame,
            text=title,
            width=150,
            anchor="w",
            font=("Segoe UI", 16, "bold")
        ).pack(side="left", padx=10, pady=10)

        ctk.CTkLabel(
            frame,
            text=value,
            anchor="w"
        ).pack(side="left")

    def back(self):
        app = self._find_app()
        if app:
            app.show_page(__import__('dashboard').Dashboard)
        else:
            try:
                self.destroy()
            except Exception:
                pass
            Dashboard(self.master)

    def _find_app(self):
        parent = self.master
        while parent is not None:
            if hasattr(parent, "show_page"):
                return parent
            parent = getattr(parent, "master", None)
        return None

    def logout(self):

        Session.logout()

        self.master.destroy()