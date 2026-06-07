import React from "react";
import Sidebar from "@/components/Main/Sidebar/Sidebar";
import * as Checkbox from "@radix-ui/react-checkbox";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import { Select } from "radix-ui";
import classnames from "classnames";

type SelectItemProps = {
  value: string;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
};

const SelectItem = React.forwardRef<any, SelectItemProps>(
  ({ children, className, ...props }, forwardedRef) => {
    return (
      <Select.Item
        className={classnames("SelectItem", className)}
        {...(props as any)}
        ref={forwardedRef}
      >
        <Select.ItemText>{children}</Select.ItemText>
        <Select.ItemIndicator className="SelectItemIndicator">
          <CheckIcon />
        </Select.ItemIndicator>
      </Select.Item>
    );
  },
);

type Props = {
  onSubmit?: (username: string, password: string) => void;
  loading?: boolean;
};

export default function LoginPage({ onSubmit, loading }: Props) {
  return (
    <div className="login-form-container">
      <h1>Sign In</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const username = (
            form.elements.namedItem("username") as HTMLInputElement
          ).value;
          const password = (
            form.elements.namedItem("password") as HTMLInputElement
          ).value;
          if (onSubmit) onSubmit(username, password);
        }}
      >
        <div className="form-field">
          <input
            type="text"
            id="username"
            name="username"
            placeholder=" "
            required
          />
          <label htmlFor="username">Username</label>
        </div>

        <div className="form-field">
          <input
            type="password"
            id="password"
            name="password"
            placeholder=" "
            required
          />
          <label htmlFor="password">Password</label>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: "1rem",
          }}
        >
          <Checkbox.Root id="remember" className="CheckboxRoot" defaultChecked>
            <Checkbox.Indicator className="CheckboxIndicator">
              <CheckIcon />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <label htmlFor="remember" style={{ cursor: "pointer" }}>
            Remember me
          </label>
        </div>

        <Select.Root>
          <Select.Trigger className="SelectTrigger" aria-label="County">
            <Select.Value placeholder="Select a county" />
            <Select.Icon className="SelectIcon">
              <ChevronDownIcon />
            </Select.Icon>
          </Select.Trigger>

          <Select.Portal>
            <Select.Content className="SelectContent">
              <Select.ScrollUpButton className="SelectScrollButton">
                <ChevronUpIcon />
              </Select.ScrollUpButton>
              <Select.Viewport className="SelectViewport">
                <Select.Group>
                  <Select.Label className="SelectLabel">Counties</Select.Label>
                  <SelectItem value="MCPS">
                    Montgomery County Public Schools
                  </SelectItem>
                  <SelectItem value="FCPS">
                    Frederick County Public Schools
                  </SelectItem>
                </Select.Group>
              </Select.Viewport>
              <Select.ScrollDownButton className="SelectScrollButton">
                <ChevronDownIcon />
              </Select.ScrollDownButton>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        <button type="submit" className="login-button">
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>Logging in...</span>
            </>
          ) : (
            "Login"
          )}
        </button>
      </form>
    </div>
  );
}
