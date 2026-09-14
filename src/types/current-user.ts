import { ZodNumber } from "zod";

export interface CurrentUser {

    id: string;

    authId: string;

    employeeId: string | null;

    firstName: string;

    lastName: string;

    fullName: string;

    email: string;
    
    roleId: number;

    roleName: string;

    permissions: string[];

    isActive: boolean;

}