import "express";

declare global {
    namespace Express {

        interface AuthUser {
            id: string;
            email: string;
        }

        interface CurrentUser {
            id: string;
            authId: string;
            employeeId: string;
            email: string;
            roleId: string;
            roleName: string;
            permissions: string[];
            isActive: boolean;
        }

        interface Request {
            auth?: AuthUser;
            user?: CurrentUser;
        }

    }
}

export {};