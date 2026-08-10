import customtkinter as ctk

from login import LoginPage
from dashboard import Dashboard
from workqueue import WorkQueue
from profile import Profile
from session import Session

ctk.set_appearance_mode("Light")
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
        self.content_frame = ctk.CTkFrame(self)
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
        # Create or destroy sidebar depending on login state
        try:
            if logged_in and not self.sidebar:
                # create sidebar
                self.sidebar = ctk.CTkFrame(self, width=220)
                # pack sidebar before content so it appears on the left
                self.sidebar.pack(side="left", fill="y")

                ctk.CTkLabel(self.sidebar, text="VTO Collector", font=("Segoe UI", 16, "bold")).pack(pady=(16, 8))

                self.btn_dashboard = ctk.CTkButton(self.sidebar, text="Dashboard", width=200, command=lambda: self.show_page(Dashboard))
                self.btn_dashboard.pack(pady=6)

                self.btn_workqueue = ctk.CTkButton(self.sidebar, text="Work Queue", width=200, command=lambda: self.show_page(WorkQueue))
                self.btn_workqueue.pack(pady=6)

                self.btn_profile = ctk.CTkButton(self.sidebar, text="Profile", width=200, command=lambda: self.show_page(Profile))
                self.btn_profile.pack(pady=6)

                self.btn_logout = ctk.CTkButton(self.sidebar, text="Logout", fg_color="red", hover_color="#b91c1c", width=200, command=self.logout)
                self.btn_logout.pack(side="bottom", pady=12)

                # ensure content_frame is packed to the right of sidebar
                self.content_frame.pack_forget()
                self.content_frame.pack(side="left", fill="both", expand=True)

            if not logged_in and self.sidebar:
                try:
                    self.sidebar.destroy()
                except Exception:
                    pass
                self.sidebar = None
                self.content_frame.pack_forget()
                self.content_frame.pack(side="left", fill="both", expand=True)
        except Exception:
            pass

    def logout(self):
        Session.logout()
        self.show_page(LoginPage)


if __name__ == "__main__":

    app = App()

    app.mainloop()