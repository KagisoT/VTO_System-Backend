import "express";

declare global {

    namespace Express {

        interface User {

            id: string;

            email: string;

            role_id: number;

            permissions: string[];

            employeeId: string;

        }

        interface Request {

            user?: User;

        }

    }

}

export {};