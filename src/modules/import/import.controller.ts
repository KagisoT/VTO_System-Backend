import {
    NextFunction,
    Request,
    Response
} from "express";

import {
    ImportService
} from "../import/import.service";


export class ImportController {

    constructor(
        private readonly service: ImportService
    ) {}


    // =====================================================
    // VALIDATE
    // =====================================================

    validate = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {

        try {

            const result =
                await this.service
                    .validateImport(
                        req.body
                    );


            res.status(200).json({

                success: true,

                data: result

            });

        }

        catch (error) {

            next(error);

        }

    };


    // =====================================================
    // COMMIT
    // =====================================================

    commit = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {

        try {

            const uploadedBy =
                this.getAuthenticatedUserId(
                    req,
                    res
                );


            const result =
                await this.service
                    .commitImport(
                        req.body,
                        uploadedBy
                    );


            res.status(201).json({

                success: true,

                data: result

            });

        }

        catch (error) {

            next(error);

        }

    };


    // =====================================================
    // AUTHENTICATED USER
    // =====================================================

    private getAuthenticatedUserId(
        req: Request,
        res: Response
    ): string {

        /*
         * We do not accept uploadedBy from req.body.
         *
         * auth/loadUser middleware must establish the
         * authenticated identity.
         *
         * These checks support the common request shapes
         * while we keep authentication ownership outside
         * the import module.
         */

        const request =
            req as Request & {
                user?: {
                    id?: string;
                    userId?: string;
                    authId?: string;
                    auth_id?: string;
                };
            };


        const localUser =
            res.locals?.user as
                | {
                    id?: string;
                    userId?: string;
                    authId?: string;
                    auth_id?: string;
                }
                | undefined;


        const userId =
            request.user?.id
            ??
            request.user?.userId
            ??
            request.user?.authId
            ??
            request.user?.auth_id
            ??
            localUser?.id
            ??
            localUser?.userId
            ??
            localUser?.authId
            ??
            localUser?.auth_id;


        if (!userId) {

            throw new Error(
                "Authenticated user ID is unavailable for import."
            );

        }


        return userId;
    }

}