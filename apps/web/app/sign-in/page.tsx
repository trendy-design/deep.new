'use client';

import { useAuth, useSignIn } from '@clerk/nextjs';
import { CustomSignIn } from '@repo/common/components';
import { useRouter } from 'next/navigation';

export default function OauthSignIn() {
    const { signIn } = useSignIn();
    const { isSignedIn, isLoaded } = useAuth();
    const router = useRouter();
    if (!signIn) return null;

    if (isSignedIn) {
        router.push('/chat');
    }

    if (!isLoaded) return null;

    return (
        <div className="bg-secondary/95 fixed inset-0 z-[100] flex h-full w-full flex-col items-center justify-center gap-2 backdrop-blur-sm">
            <CustomSignIn
                onClose={() => {
                    router.push('/chat');
                }}
            />

            <div className="text-muted-foreground/50 mt-4 w-[300px] text-xs">
                <span className="text-muted-foreground/50">
                    By using this app, you agree to the{' '}
                </span>
                <a href="/terms" className="hover:text-foreground underline">
                    Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="hover:text-foreground underline">
                    Privacy Policy
                </a>
            </div>
        </div>
    );
}
