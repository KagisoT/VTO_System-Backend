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

    email: z
        .string()
        .email(),

    password: z
        .string()
        .min(8)
        .max(100)

});

