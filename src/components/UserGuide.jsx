import Markdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import Title from './form/Title'
import guideMarkdown from '../../docs/user-guide.md?raw'

const imageUrls = import.meta.glob('../../docs/user-guide-images/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
})

const imageByFilename = Object.fromEntries(
    Object.entries(imageUrls).map(([path, url]) => [path.split('/').pop(), url])
)

function resolveImgSrc(src) {
    if (!src) return src
    if (/^(https?:)?\/\//i.test(src) || src.startsWith('/')) return src
    const filename = src.split('/').pop()
    return imageByFilename[filename] ?? src
}

function handleLinkClick(href) {
    return (e) => {
        if (!href || !href.startsWith('#')) return
        e.preventDefault()
        const id = href.slice(1)
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
}

export default function UserGuide() {
    return (
        <div id="user-guide" className="container py-4">
            <Title>User Guide</Title>
            <article className="user-guide-content">
                <Markdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSlug]}
                    components={{
                        img: ({ src, alt, ...rest }) => (
                            <img src={resolveImgSrc(src)} alt={alt} className="img-fluid my-3" {...rest} />
                        ),
                        a: ({ href, children, ...rest }) => {
                            const isHash = href?.startsWith('#')
                            return (
                                <a
                                    href={href}
                                    onClick={isHash ? handleLinkClick(href) : undefined}
                                    target={isHash ? undefined : '_blank'}
                                    rel={isHash ? undefined : 'noopener noreferrer'}
                                    {...rest}
                                >
                                    {children}
                                </a>
                            )
                        },
                        table: ({ children, ...rest }) => (
                            <table className="table table-bordered" {...rest}>{children}</table>
                        ),
                    }}
                >
                    {guideMarkdown}
                </Markdown>
            </article>
        </div>
    )
}
