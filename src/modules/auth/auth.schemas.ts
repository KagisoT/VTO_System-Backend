import { z } from "zod";

/**
 * POST /auth/login
 */
export const loginSchema = z.object({

    body: z.object({

        email: z
            .email("Invalid email address.")
            .trim()
            .toLowerCase(),

        password: z
            .string()
            .min(8, "Password must be at least 8 characters.")
            .max(100)

    })

});

/**
 * POST /auth/forgot-password
 */
export const forgotPasswordSchema = z.object({

    body: z.object({

        email: z
            .email("Invalid email address.")
            .trim()
            .toLowerCase()

    })

});

/**
 * POST /auth/reset-password
 */
export const resetPasswordSchema = z.object({

    body: z.object({

        password: z
            .string()
            .min(8, "Password must be at least 8 characters.")
            .max(100)

    })

});

/**
 * POST /auth/refresh
 */
export const refreshTokenSchema = z.object({

    body: z.object({

        refreshToken: z
            .string()
            .min(1, "Refresh token is required.")

    })

});

export const registerSchema = z.object({

    body: z.object({

        email: z
            .string()
            .email("Invalid email address.")
            .trim()
            .toLowerCase(),

        password: z
            .string()
            .min(8, "Password must be at least 8 characters.")
            .max(100),

        name: z
            .string() 
            .max(25),

        surname: z
            .string()
            .max(25),

        roleId: z.coerce.number()
            .int()
            .min(1, "roleId must be at least 1")
            .positive()
            .optional()

    })

});

export type RegisterDto =
    z.infer<typeof registerSchema>["body"];