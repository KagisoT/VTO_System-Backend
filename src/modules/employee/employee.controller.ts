import { Request, Response } from "express";

import { EmployeeService } from "./employee.service";

import { devLogger } from "../../utils/dev-logger";


export class EmployeeController {

    constructor(
        private readonly employeeService: EmployeeService
    ) {}


    /**
     * GET /api/employees
     *
     * Returns all employees.
     */
    async getEmployees(
        req: Request,
        res: Response
    ): Promise<void> {

        try {

            const employees =
                await this.employeeService.getEmployees();


            res.status(200).json({

                success: true,

                data: employees

            });

        } catch (error) {

            devLogger.error(
                "EmployeeController.getEmployees failed",
                error
            );


            res.status(500).json({

                success: false,

                message: "Failed to retrieve employees."

            });
        }
    }


    /**
     * GET /api/employees/:employeeId/overview
     *
     * Returns the employee overview.
     */
async getOverview(
    req: Request,
    res: Response
): Promise<void> {

    try {

        const employeeId =
            req.params.employeeId;


        if (typeof employeeId !== "string") {

            res.status(400).json({

                success: false,

                message: "Invalid employee ID."

            });

            return;
        }


        const overview =
            await this.employeeService.getOverview(
                employeeId
            );


        res.status(200).json({

            success: true,

            data: overview

        });

    } catch (error) {

        devLogger.error(
            "EmployeeController.getOverview failed",
            error
        );


        res.status(500).json({

            success: false,

            message: "Failed to retrieve employee overview."

        });
    }

    
    }
    

}