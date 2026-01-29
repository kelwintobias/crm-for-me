import versionData from '../../../version.json';

export function Footer() {
    return (
        <footer className="border-t border-white/[0.06] py-4 px-4 md:px-8">
            <div className="flex items-center justify-center text-sm text-text-tertiary">
                <span className="font-medium">UPBOOST CRM • v{versionData.version}</span>
            </div>
        </footer>
    );
}
