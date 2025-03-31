import { CitationProviderContext, CodeBlock, LinkPreviewPopover } from '@repo/common/components';
import { isValidUrl } from '@repo/shared/utils';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { ComponentProps, ReactElement, useContext } from 'react';

export const mdxComponents: ComponentProps<typeof MDXRemote>['components'] = {
    Source: ({ children }) => {
        const { getSourceByIndex } = useContext(CitationProviderContext);
        const index = children as string;

        const source = getSourceByIndex(parseInt(index));

        console.log(source, children);

        const url = source?.link;

        if (!url) {
            return <span className="text-red-500">{index}</span>;
        }

        const isValid = isValidUrl(url);

        if (!isValid) {
            return null;
        }

        return (
            <LinkPreviewPopover url={url}>
                <div className="group mx-0.5 inline-flex size-4 flex-row items-center justify-center gap-1 rounded-sm bg-emerald-600/20 text-[10px] font-medium text-emerald-700">
                    {source?.index}
                </div>
            </LinkPreviewPopover>
        );
    },
    p: ({ children }) => {
        return <p>{children}</p>;
    },
    li: ({ children }) => {
        return <li>{children}</li>;
    },

    pre: ({ children }) => {
        if (typeof children === 'string') {
            return <CodeBlock code={children.replace(/<FadeEffect \/>$/, '')} />;
        }
        const codeElement = children as ReactElement;
        const className = codeElement?.props?.className || '';
        const lang = className.replace('language-', '');
        const code = codeElement?.props?.children;

        return <CodeBlock code={String(code).replace(/<FadeEffect \/>$/, '')} lang={lang} />;
    },
    code: ({ children, className }) => {
        if (!className) {
            return (
                <code className="rounded-md border border-yellow-700/20 !bg-yellow-700/10 px-1.5 py-0.5 font-mono text-sm text-yellow-700">
                    {children}
                </code>
            );
        }
        const lang = className.replace('language-', '');
        return <CodeBlock code={String(children).replace(/<FadeEffect \/>$/, '')} lang={lang} />;
    },
};
