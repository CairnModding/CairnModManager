import type { MouseEvent } from "react";
import { parseBBCode, type BBCodeInline } from "../../domain/bbcode";
import "./components.css";

function InlineNode({
  node,
  onOpenLink,
}: {
  node: BBCodeInline;
  onOpenLink: (url: string) => void;
}) {
  switch (node.type) {
    case "bold":
      return <strong>{node.text}</strong>;
    case "italic":
      return <em>{node.text}</em>;
    case "underline":
      return <u>{node.text}</u>;
    case "link":
      return (
        <a
          href={node.href}
          onClick={(e: MouseEvent) => {
            e.preventDefault();
            onOpenLink(node.href);
          }}
        >
          {node.text}
        </a>
      );
    case "text":
      return <>{node.text}</>;
  }
}

/** Renders Nexus's BBCode mod descriptions as actual paragraphs/lists/links instead of flattening
 * everything to plain text — links open via `onOpenLink` (the system browser), never as an
 * in-webview navigation. */
export function BBCodeContent({ source, onOpenLink }: { source: string; onOpenLink: (url: string) => void }) {
  const blocks = parseBBCode(source);

  return (
    <div className="cm-bbcode">
      {blocks.map((block, i) => {
        if (block.type === "list") {
          return (
            <ul className="cm-bbcode__list" key={i}>
              {block.items.map((item, j) => (
                <li key={j}>
                  {item.map((node, k) => (
                    <InlineNode key={k} node={node} onOpenLink={onOpenLink} />
                  ))}
                </li>
              ))}
            </ul>
          );
        }

        // A paragraph consisting of nothing but a single bold run reads as a section title
        // ("Description", "Installation instructions", ...) rather than body text.
        const isHeading = block.inline.length === 1 && block.inline[0].type === "bold";
        const Tag = isHeading ? "h3" : "p";
        return (
          <Tag className={isHeading ? "cm-bbcode__heading" : "cm-bbcode__paragraph"} key={i}>
            {block.inline.map((node, k) => (
              <InlineNode key={k} node={node} onOpenLink={onOpenLink} />
            ))}
          </Tag>
        );
      })}
    </div>
  );
}
