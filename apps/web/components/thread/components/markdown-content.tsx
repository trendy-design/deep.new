import { mdxComponents } from '@/libs/mdx/mdx-components';
import { cn } from '@repo/ui';
import { MDXRemote } from 'next-mdx-remote';
import { MDXRemoteSerializeResult } from 'next-mdx-remote/rsc';
import { serialize } from 'next-mdx-remote/serialize';
import { memo, useEffect, useState } from 'react';
import remarkGfm from 'remark-gfm';

type MarkdownContentProps = {
    content: string;
    className?: string;
};

const markdownStyles = {
    'animate-fade-in prose prose-sm min-w-full': true,

    // Text styles
    'prose-p:font-light prose-p:tracking-[0.01em]': true,
    'prose-headings:text-base prose-headings:font-medium prose-headings:tracking-[0.005em]': true,
    'prose-strong:font-medium prose-th:font-medium': true,

    // Code styles
    'prose-code:font-mono prose-code:text-sm prose-code:font-normal': true,
    'prose-code:bg-secondary prose-code:border-border prose-code:border prose-code:rounded-lg prose-code:p-0.5':
        true,

    // Table styles
    'prose-table:border-border prose-table:border prose-table:rounded-lg prose-table:bg-background':
        true,

    // Table header
    'prose-th:text-sm prose-th:font-medium prose-th:text-muted-foreground prose-th:bg-tertiary prose-th:px-3 prose-th:py-1.5':
        true,

    // Table row
    'prose-tr:border-border prose-tr:border': true,

    // Table cell
    'prose-td:px-3 prose-td:py-2.5': true,

    // Theme
    'prose-prosetheme': true,
};

export const removeIncompleteTags = (content: string) => {
    // A simpler approach that handles most cases:
    // 1. If the last < doesn't have a matching >, remove from that point onward
    const lastLessThan = content.lastIndexOf('<');
    if (lastLessThan !== -1) {
        const textAfterLastLessThan = content.substring(lastLessThan);
        if (!textAfterLastLessThan.includes('>')) {
            return content.substring(0, lastLessThan);
        }
    }

    return content;
};

// New function to normalize content before serialization
export const normalizeContent = (content: string) => {
    // Replace literal "\n" strings with actual newlines
    // This handles cases where newlines are escaped in the string
    return content.replace(/\\n/g, '\n');
};

export const MarkdownContent = memo(({ content, className }: MarkdownContentProps) => {
    const [serializedMdx, setSerializedMdx] = useState<MDXRemoteSerializeResult | null>(null);

    useEffect(() => {
        if (!content) return;

        (async () => {
            try {
                // Apply both normalizeContent and removeIncompleteTags
                const normalizedContent = normalizeContent(content);
                const cleanedContent = removeIncompleteTags(normalizedContent);
                const mdx = await serialize(cleanedContent, {
                    mdxOptions: {
                        remarkPlugins: [remarkGfm],
                    },
                });
                setSerializedMdx(mdx);
            } catch (error) {
                console.error('Error serializing MDX:', error);
            }
        })();
    }, [content]);

    if (!serializedMdx) {
        return null;
    }

    return (
        <div className={cn('', markdownStyles, className)}>
            <MDXRemote {...serializedMdx} components={mdxComponents} />
        </div>
    );
});

MarkdownContent.displayName = 'MarkdownContent';

export const MemoizedMdxChunk = memo(({ source }: { source: MDXRemoteSerializeResult }) => {
    if (!source) {
        return null;
    }
    return <MDXRemote {...source} components={mdxComponents} />;
});

MemoizedMdxChunk.displayName = 'MemoizedMdxChunk';
