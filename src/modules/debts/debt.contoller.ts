import {
    Request,
    Response,
    NextFunction
} from "express";

type DebtParams = {
    id: string;
};

import { DebtService } from "./debt.service";
import { devLogger } from "../../utils/dev-logger";



export class DebtController {

    constructor(
        private readonly service: DebtService
    ) {}

    /**
     * POST /debts
     */
    create = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        try {

            const debt =
                await this.service.create(
                    req.body
                );

            return res.status(201).json(debt);

        }

        catch (error) {

            next(error);

        }

    };

    /**
     * GET /debts
     */
    findAll = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => { 

        try {

            devLogger.debug("debt.controller.findAll: reached controller", {
                userId: req.user?.id,
                userPermissions: req.user?.permissions
            });

            const debts =
                await this.service.findAll();

            devLogger.debug("debt.controller.findAll: service returned debts", {
                debtCount: debts.length
            });

            return res.json(debts);

        }

        catch (error) {

            next(error);

        }

    };

    /**
     * GET /debts/:id
     */
    findById = async (
        req: Request<DebtParams>,
        res: Response,
        next: NextFunction
    ) => {

        try {

            const debt =
                await this.service.findById(
                    req.params.id
                );

            return res.json(debt);

        }

        catch (error) {

            next(error);

        }

    };

    /**
     * PATCH /debts/:id/status
     */
    updateStatus = async (
        req: Request<DebtParams>,
        res: Response,
        next: NextFunction
    ) => {

        try {

            const debt =
                await this.service.updateStatus(
                    req.params.id,
                    req.body
                );

            return res.json(debt);

        }

        catch (error) {

            next(error);

        }

    };

    /**
     * PATCH /debts/:id/assignment
     */
    assignDebt = async (
        req: Request<DebtParams>,
        res: Response,
        next: NextFunction
    ) => {

        try {

            const debt =
                await this.service.assignDebt(
                    req.params.id,
                    req.body
                );

            return res.json(debt);

        }

        catch (error) {

            next(error);

        }

    };

    /**
     * PATCH /debts/:id/balance
     */
    updateBalance = async (
        req: Request<DebtParams>,
        res: Response,
        next: NextFunction
    ) => {

        try {

            const debt =
                await this.service.updateBalance(
                    req.params.id,
                    req.body
                );

            return res.json(debt);

        }

        catch (error) {

            next(error);

        }

    };

    /**
     * PATCH /debts/:id/notes
     */
    updateNotes = async (
        req: Request<DebtParams>,
        res: Response,
        next: NextFunction
    ) => {

        try {

            const debt =
                await this.service.updateNotes(
                    req.params.id,
                    req.body
                );

            return res.json(debt);

        }

        catch (error) {

            next(error);

        }

    };

    /**
     * DELETE /debts/:id
     */
    delete = async (
        req: Request<DebtParams>,
        res: Response,
        next: NextFunction
    ) => {

        try {

            await this.service.delete(
                req.params.id
            );

            return res.sendStatus(204);

        }

        catch (error) {

            next(error);

        }

    };

}