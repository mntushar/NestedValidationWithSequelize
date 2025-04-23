import { CreationAttributes, Model, ModelStatic } from "sequelize";
import Errors from "./error_handler";
import Utility from "./utility";

type NestedModelDefinition<T extends Model> = {
    name: string;
    model: ModelStatic<T>;
    nestedModelDefinition?: NestedModelDefinition<any>[] | null;
};

class DataValidator<T extends Model> {
    private utility: Utility;
    private model: ModelStatic<T>;

    constructor(model: ModelStatic<T>) {
        this.utility = new Utility();
        this.model = model;
    }

    async validateData(request: Request): Promise<CreationAttributes<T>> {
        try {
            const data = await request.json();
            const instance = this.model.build(data);
            await instance.validate();
            return data;
        } catch (error) {
            throw new Errors(error as Error, 400, 'Validation error.');
        }
    }

    async validateNestedData(data: any): Promise<boolean> {
        try {
            const instance = this.model.build(data);
            await instance.validate();
            return true;
        } catch (error) {
            throw new Errors(error as Error, 400, 'Validation error.');
        }
    }
}

// Standalone function
async function apiData<T extends Model>(model: ModelStatic<T>, request: Request): Promise<CreationAttributes<T>> {
    const validator = new DataValidator<T>(model);
    return await validator.validateData(request);
}

async function validateNestedModels(
    data: any,
    nestedModels: NestedModelDefinition<any>[]
): Promise<void> {
    for (const nested of nestedModels) {
        const { name, model, nestedModelDefinition } = nested;

        if (Array.isArray(data[name])) {
            for (const item of data[name]) {
                const validator = new DataValidator<any>(model);
                await validator.validateNestedData(item);

                // Recursive validation if more nested definitions exist
                if (nestedModelDefinition) {
                    await validateNestedModels(item, nestedModelDefinition);
                }
            }
        }
    }
}

async function apiNestedData<T extends Model>(
    model: ModelStatic<T>,
    request: Request,
    nestedModels: NestedModelDefinition<any>[]
): Promise<CreationAttributes<T>> {
    const validator = new DataValidator<T>(model);
    const data = await validator.validateData(request);

    await validateNestedModels(data, nestedModels);

    return data;
}

const dataValidation = {
    apiData,
    apiNestedData
}

export default dataValidation;
