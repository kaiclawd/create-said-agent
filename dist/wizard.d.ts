interface WizardOptions {
    template?: string;
    skipInstall?: boolean;
    skipRegister?: boolean;
}
/**
 * Run the interactive wizard
 */
export declare function runWizard(projectName?: string, options?: WizardOptions): Promise<void>;
export {};
