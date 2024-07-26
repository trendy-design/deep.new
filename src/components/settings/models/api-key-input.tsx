import { Flex } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { SquareLock02Icon, ViewIcon, ViewOffIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { FC, useState } from "react";
export type TApiKeyInput = {
  value: string;
  setValue: (key: string) => void;
  isDisabled: boolean;
  placeholder: string;
  isLocked: boolean;
};

const ApiKeyInput: FC<TApiKeyInput> = ({
  value,
  setValue,
  isDisabled,
  placeholder,
  isLocked,
}) => {
  const [showKey, setShowKey] = useState<boolean>(false);

  return (
    <div className="relative flex w-full flex-row items-center gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        disabled={isDisabled}
        type={showKey ? "text" : "password"}
        autoComplete="new-password"
        className="w-full pr-16"
        onChange={(e) => {
          setValue(e.target.value);
        }}
      />
      <Flex items="center" gap="sm" className="absolute right-2">
        {isLocked && (
          <SquareLock02Icon
            size={16}
            variant="solid"
            className="text-zinc-500"
          />
        )}
        <Button
          variant="ghost"
          size="iconXS"
          onClick={() => setShowKey(!showKey)}
        >
          {showKey ? (
            <ViewOffIcon size={16} variant="solid" />
          ) : (
            <ViewIcon size={16} variant="solid" />
          )}
        </Button>
      </Flex>
    </div>
  );
};

export default ApiKeyInput;
