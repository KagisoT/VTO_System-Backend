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
            employeeId: string | null;
            firstName: string;

            lastName: string;
            email: string;
            roleId: number;
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