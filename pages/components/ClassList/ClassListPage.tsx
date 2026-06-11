import React from "react";
import ClassCard from "./ClassCard";
import type { ClassProps } from "../../../src/types/Grades";
import useSessionStore from "../../../src/stores/useSessionStore";

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

export default function ClassListPage() {
  const classes = useSessionStore((s) => s.classes);
  //grab selected class period for purpose of logging
  const selectedMP = useSessionStore((s) => s.selectedMarkingPeriod);
  const changeMarkingPeriod = useSessionStore((s) => s.changeMarkingPeriod);

  const markingPeriodNames = [
    "MP1 Interim",
    "MP1",
    "MP2 Interim",
    "MP2",
    "MP3 Interim",
    "MP3",
    "MP4 Interim",
    "MP4",
  ];

  return (
    <div className="class-list-container">
      <Select.Root
        value={selectedMP ?? undefined}
        onValueChange={(v: string) => changeMarkingPeriod(v)}
      >
        <Select.Trigger className="SelectTrigger" aria-label="Marking Period">
          <Select.Value
            placeholder={String(selectedMP ?? "Select marking period")}
          />
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
                <Select.Label className="SelectLabel">
                  Marking Period
                </Select.Label>
                {markingPeriodNames.map((mp) => (
                  <SelectItem key={mp} value={mp}>
                    {mp}
                  </SelectItem>
                ))}
              </Select.Group>
            </Select.Viewport>
            <Select.ScrollDownButton className="SelectScrollButton">
              <ChevronDownIcon />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <ul className="card-container">
        {classes?.map((item, index) => {
          // item will be ClassProps
          const classIndex = index + 1; // 1-based index as requested
          return (
            <ClassCard
              key={index}
              {...(item as ClassProps)}
              classIndex={classIndex}
            />
          );
        })}
      </ul>
    </div>
  );
}
