import logging

import customtkinter as ctk
from tkinter import messagebox

from api import api
from session import Session
from dashboard import Dashboard

logger = logging.getLogger("vto_collector.login")


class LoginPage(ctk.CTkFrame):

    def __init__(self, master):

        super().__init__(master)

        self.pack(fill="both", expand=True)

        self.build()

    def build(self):

        left = ctk.CTkFrame(self, fg_color="#0f172a")
        left.pack(side="left", fill="both", expand=True)

        right = ctk.CTkFrame(self)
        right.pack(side="right", fill="both", expand=True)

        title = ctk.CTkLabel(
            left,
            text="VTO Collector",
            font=("Segoe UI", 34, "bold"),
            text_color="white"
        )
        title.place(relx=0.5, rely=0.45, anchor="center")

        subtitle = ctk.CTkLabel(
            left,
            text="Debt Collection System",
            font=("Segoe UI", 18),
            text_color="#CBD5E1"
        )
        subtitle.place(relx=0.5, rely=0.52, anchor="center")

        ctk.CTkLabel(
            right,
            text="Sign In",
            font=("Segoe UI", 30, "bold")
        ).pack(pady=(120, 40))

        self.email = ctk.CTkEntry(
            right,
            width=320,
            height=42,
            placeholder_text="Email"
        )
        self.email.pack(pady=10)

        self.password = ctk.CTkEntry(
            right,
            width=320,
            height=42,
            show="*",
            placeholder_text="Password"
        )
        self.password.pack(pady=10)

        ctk.CTkButton(
            right,
            text="Login",
            width=320,
            height=45,
            command=self.login
        ).pack(pady=(10, 8))

        # Quick-fill demo credentials placeholder
        ctk.CTkButton(
            right,
            text="Use Demo Credentials",
            width=200,
            height=34,
            fg_color="#1F2937",
            command=self.fill_demo
        ).pack(pady=(0, 30))

    def login(self):

        email = self.email.get().strip()

        password = self.password.get().strip()

        if email == "" or password == "":

            messagebox.showerror(
                "Error",
                "Enter email and password."
            )

            return

        try:
            data = api.login(email, password)

            # If login returned a requests.Response, check status code first
            response_obj = None
            if hasattr(data, "status_code"):
                response_obj = data
                logger.debug("Login response status=%s", response_obj.status_code)
                try:
                    data = response_obj.json()
                except Exception:
                    data = {}

            # Support multiple possible API shapes for token/user
            token = None
            user = None

            TOKEN_KEYS = {
                "token",
                "access_token",
                "accesstoken",
                "auth_token",
                "authtoken",
                "id_token",
                "jwt",
                "authorization",
                "auth",
            }

            def find_token(value):
                if isinstance(value, dict):
                    for key, inner in value.items():
                        if key.lower() in TOKEN_KEYS:
                            if isinstance(inner, (str, bytes)):
                                return inner
                            return find_token(inner)
                    for inner in value.values():
                        found = find_token(inner)
                        if found:
                            return found
                elif isinstance(value, list):
                    for item in value:
                        found = find_token(item)
                        if found:
                            return found
                return None

            def normalize_token(raw_token):
                if isinstance(raw_token, (str, bytes)):
                    token_str = raw_token.decode() if isinstance(raw_token, (bytes, bytearray)) else raw_token
                    token_str = token_str.strip()
                    if token_str.lower().startswith("bearer "):
                        return token_str.split(None, 1)[1]
                    return token_str
                return None

            def extract_login_data(response_data):
                if not isinstance(response_data, dict):
                    return None, None

                token_value = (
                    response_data.get("token")
                    or response_data.get("access_token")
                    or response_data.get("accessToken")
                    or response_data.get("jwt")
                    or (response_data.get("auth") or {}).get("token")
                )
                if isinstance(response_data.get("data"), dict):
                    nested = response_data["data"]
                    token_value = token_value or (
                        nested.get("token")
                        or nested.get("access_token")
                        or nested.get("accessToken")
                        or nested.get("jwt")
                    )

                user_value = (
                    response_data.get("user")
                    or response_data.get("userData")
                    or response_data.get("profile")
                )
                if isinstance(response_data.get("data"), dict):
                    nested = response_data["data"]
                    user_value = user_value or nested.get("user") or nested.get("profile") or nested.get("userData")

                return normalize_token(token_value), user_value

            if isinstance(data, dict):
                token, user = extract_login_data(data)
                if token is None:
                    token = find_token(data)
                    token = normalize_token(token)

                if isinstance(user, dict):
                    pass
                elif isinstance(data.get("data"), dict) and isinstance(data["data"].get("user"), dict):
                    user = data["data"].get("user")
                elif isinstance(data.get("data"), dict) and isinstance(data["data"].get("profile"), dict):
                    user = data["data"].get("profile")
            elif isinstance(data, str):
                token = normalize_token(data)

            if not token and response_obj is not None:
                headers = response_obj.headers or {}
                auth_header = (
                    headers.get("Authorization")
                    or headers.get("authorization")
                    or headers.get("X-Auth-Token")
                    or headers.get("x-auth-token")
                    or headers.get("X-Access-Token")
                    or headers.get("x-access-token")
                )
                if isinstance(auth_header, str):
                    auth_header = auth_header.strip()
                    if auth_header.lower().startswith("bearer "):
                        token = auth_header.split(None, 1)[1]
                    else:
                        token = auth_header

            if token:
                logger.info("Login token received")
                Session.login(token, user)
                app = self._find_app()
                if app:
                    app.show_page(Dashboard)
                return

            # If we have a response object, prefer its status code for success
            if response_obj is not None:
                if 200 <= getattr(response_obj, "status_code", 0) < 300:
                    logger.debug("Login response was successful but no token found")
                    messagebox.showerror(
                        "Login Failed",
                        "Login succeeded but no authentication token was returned."
                    )
                    return
                else:
                    # show the server-provided message when available
                    message = None
                    if isinstance(data, dict):
                        message = data.get("message")
                    if not message:
                        try:
                            message = response_obj.text
                        except Exception:
                            message = "Login failed"
                    messagebox.showerror("Login Failed", message)
                    return

            # If API returns a success message but no token, accept it and continue
            if isinstance(data, dict):
                msg = str(data.get("message", "")).lower()
                if "success" in msg or msg == "ok" or "logged in" in msg or "authenticated" in msg:
                    logger.debug("No token found in login response, refusing to continue")
                    messagebox.showerror(
                        "Login Failed",
                        "Login succeeded but no authentication token was returned."
                    )
                    return

            # Fallback error message
            messagebox.showerror(
                "Login Failed",
                (data.get("message") if isinstance(data, dict) else "Invalid credentials.")
            )

        except Exception as ex:
            messagebox.showerror("Connection Error", str(ex))

    def fill_demo(self):
        try:
            # Demo credentials provided by user
            demo_email = "tastic12@gmail.com"
            demo_password = "Password4Zee"

            self.email.delete(0, "end")
            self.email.insert(0, demo_email)

            self.password.delete(0, "end")
            self.password.insert(0, demo_password)
        except Exception:
            pass

    def _find_app(self):
        # walk up widget parents until we find the App with show_page
        parent = self.master
        while parent is not None:
            if hasattr(parent, "show_page"):
                return parent
            parent = getattr(parent, "master", None)
        return None
