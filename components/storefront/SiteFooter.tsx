import { Link } from "@/i18n/navigation";

export function SiteFooter() {
    return (
        <footer className="border-t border-border bg-muted py-16 px-6">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
                <div>
                    <h3 className="text-sm font-medium text-foreground mb-4">Customer Support</h3>
                    <ul className="space-y-2">
                        <li>
                            <Link href="/contact" className="text-sm font-normal text-foreground hover:opacity-60">
                                Contact
                            </Link>
                        </li>
                        <li>
                            <Link href="/shipping" className="text-sm font-normal text-foreground hover:opacity-60">
                                Shipping
                            </Link>
                        </li>
                        <li>
                            <Link href="/returns" className="text-sm font-normal text-foreground hover:opacity-60">
                                Returns
                            </Link>
                        </li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-foreground mb-4">Company</h3>
                    <ul className="space-y-2">
                        <li>
                            <Link href="/about" className="text-sm font-normal text-foreground hover:opacity-60">
                                About
                            </Link>
                        </li>
                        <li>
                            <Link href="/careers" className="text-sm font-normal text-foreground hover:opacity-60">
                                Careers
                            </Link>
                        </li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-foreground mb-4">Legal</h3>
                    <ul className="space-y-2">
                        <li>
                            <Link href="/privacy" className="text-sm font-normal text-foreground hover:opacity-60">
                                Privacy Policy
                            </Link>
                        </li>
                        <li>
                            <Link href="/terms" className="text-sm font-normal text-foreground hover:opacity-60">
                                Terms
                            </Link>
                        </li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-foreground mb-4">Follow</h3>
                    <ul className="space-y-2">
                        <li>
                            <a href="#" className="text-sm font-normal text-foreground hover:opacity-60">
                                Instagram
                            </a>
                        </li>
                        <li>
                            <a href="#" className="text-sm font-normal text-foreground hover:opacity-60">
                                Twitter
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
                © 2026 Vault.
            </div>
        </footer>
    );
}
