export const preset = "ts-jest";
export const globals = {
    "ts-jest": {
        tsconfig: "tsconfig.jest.json"
    }
};
export const setupFilesAfterEnv = ["jest-extended/all"];
