import customtkinter as ctk
from logging_config import configure_logging

from login import LoginPage
from dashboard import Dashboard
from workqueue import WorkQueue
from arrangements import PaymentArrangements
from profile import Profile
from session import Session

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")


class App(ctk.CTk):

    def __init__(self):
        super().__init__()

        self.title("VTO Collector")

        self.geometry("1400x850")

        self.minsize(1200, 700)

        self.current_page = None

        # Content area where pages will be shown
        self.sidebar = None
        self.content_frame = ctk.CTkFrame(self, fg_color="#0F172A", corner_radius=0)
        self.content_frame.pack(side="left", fill="both", expand=True)

        # Disable nav until logged in (sidebar created after login)
        self.update_nav_state()

        # Start on login page (in content area)
        self.show_page(LoginPage)

    def show_page(self, page_class):
        # Destroy current page and instantiate new one
        try:
            if self.current_page:
                self.current_page.destroy()
        except Exception:
            pass

        # Instantiate the given page class inside the content_frame
        self.current_page = page_class(self.content_frame)

        # Update nav enabled state based on login
        self.update_nav_state()

    def update_nav_state(self):
        logged_in = bool(Session.token or Session.user)
        if logged_in and not self.sidebar:
            self.content_frame.pack_forget()
            self.sidebar = ctk.CTkFrame(
                self, width=230, corner_radius=0, fg_color="#111827"
            )
            self.sidebar.pack(side="left", fill="y")
            self.sidebar.pack_propagate(False)

            ctk.CTkLabel(
                self.sidebar, text="VTO COLLECTOR", text_color="#F9FAFB",
                font=ctk.CTkFont(size=20, weight="bold")
            ).pack(anchor="w", padx=25, pady=(30, 4))
            ctk.CTkLabel(
                self.sidebar, text="Collector Portal", text_color="#9CA3AF",
                font=ctk.CTkFont(size=12)
            ).pack(anchor="w", padx=25, pady=(0, 30))

            self.nav_buttons = {
                Dashboard: self.create_nav_button("Dashboard", Dashboard),
                WorkQueue: self.create_nav_button("Work Queue", WorkQueue),
                PaymentArrangements: self.create_nav_button("Payment Arrangements", PaymentArrangements),
                Profile: self.create_nav_button("Profile", Profile),
            }
            ctk.CTkFrame(self.sidebar, fg_color="transparent").pack(
                fill="both", expand=True
            )
            ctk.CTkButton(
                self.sidebar, text="Logout", height=40,
                fg_color="#1F2937", hover_color="#374151",
                command=self.logout
            ).pack(fill="x", padx=20, pady=20)
            self.content_frame.pack(side="left", fill="both", expand=True)

        elif not logged_in and self.sidebar:
            self.sidebar.destroy()
            self.sidebar = None

        if self.sidebar and self.current_page:
            for page_class, button in self.nav_buttons.items():
                active = isinstance(self.current_page, page_class)
                button.configure(
                    fg_color="#1F2937" if active else "transparent",
                    text_color="#FFFFFF" if active else "#D1D5DB",
                )

    def create_nav_button(self, label, page_class):
        button = ctk.CTkButton(
            self.sidebar, text=label, height=42, corner_radius=8,
            anchor="w", fg_color="transparent", hover_color="#1F2937",
            text_color="#D1D5DB", font=ctk.CTkFont(size=14),
            command=lambda: self.show_page(page_class),
        )
        button.pack(fill="x", padx=15, pady=3)
        return button

    def logout(self):
        Session.logout()
        self.show_page(LoginPage)


if __name__ == "__main__":

    configure_logging()
    app = App()

    app.mainloop()
