export const preset = "ts-jest";
export const setupFilesAfterEnv = ["jest-extended/all"];
export const transform = {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }]
};
