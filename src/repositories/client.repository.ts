import { BaseRepository } from "./base.repository";

export class ClientRepository extends BaseRepository {
    async findByIdNumber(idNumber: string) {
        return this.findOne<{ id: string }>(
            `
            SELECT id
            FROM clients
            WHERE id_number = $1
            LIMIT 1;
            `,
            [idNumber]
        );
    }

    async createClient(idNumber: string) {
        return this.findOne<{ id: string }>(
            `
            INSERT INTO clients (
                id_number,
                firstname,
                surname,
                created_at,
                updated_at
            ) VALUES (
                $1, $2, $3, NOW(), NOW()
            ) RETURNING id;
            `,
            [idNumber, 'Imported', idNumber]
        );
    }

    async updateClient() {}

}