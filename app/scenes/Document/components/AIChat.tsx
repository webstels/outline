import { observer } from "mobx-react";
import MarkdownIt from "markdown-it";
import { SparklesIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { NativeTextarea, Outline } from "~/components/Input";
import Text from "~/components/Text";
import useKeyDown from "~/hooks/useKeyDown";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { matchDocumentSlug } from "~/utils/routeHelpers";
import Sidebar from "./SidebarLayout";

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function AIChat() {
  const { ui, documents } = useStores();
  const { t } = useTranslation();
  const match = useRouteMatch<{ documentSlug: string }>(
    `/doc/${matchDocumentSlug}`
  );
  const document = match ? documents.get(match.params.documentSlug) : undefined;
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [value, setValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  useKeyDown("Escape", () => ui.set({ rightSidebar: null }));

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleClose = React.useCallback(() => {
    ui.set({ rightSidebar: null });
  }, [ui]);

  const handleSubmit = React.useCallback(async () => {
    const query = value.trim();

    if (!query || !document || loading) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: query },
    ];

    setMessages(nextMessages);
    setValue("");
    setError(undefined);
    setLoading(true);

    try {
      const response = await client.post("/documents.ask", {
        id: document.id,
        query,
        history: messages.slice(-8),
      });

      setMessages([
        ...nextMessages,
        { role: "assistant", content: response.data.answer },
      ]);
    } catch (_err) {
      setError(t("Could not generate an AI answer."));
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }, [document, loading, messages, t, value]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <Sidebar title={t("AI chat")} onClose={handleClose} scrollable={false}>
      <Wrapper column>
        <Messages column gap={12}>
          {messages.length ? (
            messages.map((message, index) => (
              <Message key={index} $role={message.role}>
                <MessageLabel>
                  {message.role === "assistant" ? t("AI") : t("You")}
                </MessageLabel>
                <MessageContent
                  $markdown={message.role === "assistant"}
                  dangerouslySetInnerHTML={{
                    __html:
                      message.role === "assistant"
                        ? markdown.render(message.content)
                        : markdown.utils.escapeHtml(message.content),
                  }}
                />
              </Message>
            ))
          ) : (
            <EmptyState column align="center" justify="center" gap={12}>
              <SparklesIcon size={32} />
              <Text as="h2" size="large">
                {t("Ask about this document")}
              </Text>
              <Text as="p" type="secondary">
                {t(
                  "Ask for a summary, key decisions, action items, or anything specific in this document."
                )}
              </Text>
            </EmptyState>
          )}
          {loading ? (
            <Message $role="assistant">
              <MessageLabel>{t("AI")}</MessageLabel>
              <MessageContent>{t("Thinking…")}</MessageContent>
            </Message>
          ) : null}
        </Messages>
        {error ? (
          <ErrorText as="p" type="danger">
            {error}
          </ErrorText>
        ) : null}
        <Composer>
          <PromptOutline margin={0} align="stretch">
            <PromptInput
              ref={inputRef}
              value={value}
              rows={3}
              placeholder={t("Ask a question…")}
              onChange={(event) => setValue(event.currentTarget.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || !document}
            />
          </PromptOutline>
          <ComposerActions justify="flex-end">
            <Button
              onClick={handleSubmit}
              disabled={loading || !value.trim() || !document}
            >
              {t("Ask")}
            </Button>
          </ComposerActions>
        </Composer>
      </Wrapper>
    </Sidebar>
  );
}

const Wrapper = styled(Flex)`
  height: 100%;
  min-height: 0;
`;

const Messages = styled(Flex)`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 16px;
`;

const EmptyState = styled(Flex)`
  flex: 1;
  text-align: center;
  color: ${s("textSecondary")};

  h2,
  p {
    margin: 0;
  }
`;

const Message = styled.div<{ $role: ChatMessage["role"] }>`
  align-self: ${(props) => (props.$role === "user" ? "flex-end" : "stretch")};
  max-width: ${(props) => (props.$role === "user" ? "85%" : "100%")};
  border: 1px solid ${s("divider")};
  border-radius: 12px;
  padding: 10px 12px;
  background: ${(props) =>
    props.$role === "user" ? props.theme.inputBackground : props.theme.background};
`;

const MessageLabel = styled.div`
  color: ${s("textSecondary")};
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
`;

const MessageContent = styled.div<{ $markdown?: boolean }>`
  white-space: pre-wrap;
  line-height: 1.5;

  ${(props) =>
    props.$markdown &&
    `
      white-space: normal;

      > :first-child {
        margin-top: 0;
      }

      > :last-child {
        margin-bottom: 0;
      }

      ul,
      ol {
        padding-inline-start: 20px;
      }

      code {
        background: ${props.theme.codeBackground};
        border-radius: 4px;
        padding: 1px 4px;
      }

      pre {
        background: ${props.theme.codeBackground};
        border-radius: 8px;
        overflow: auto;
        padding: 10px 12px;
      }
    `}
`;

const ErrorText = styled(Text)`
  padding: 0 16px;
  margin: 0 0 8px;
`;

const Composer = styled(Flex)`
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px;
  border-top: 1px solid ${s("divider")};
`;

const ComposerActions = styled(Flex)`
  width: 100%;
`;

const PromptOutline = styled(Outline)`
  flex: 1;
`;

const PromptInput = styled(NativeTextarea)`
  resize: none;
  min-height: 72px;
  max-height: 160px;
`;

export default observer(AIChat);
