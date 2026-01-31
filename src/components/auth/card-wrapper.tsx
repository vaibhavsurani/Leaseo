import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { BackButton } from "./BackButton";
import Social from "./Social";

interface CardWrapperProps {
  children: React.ReactNode;
  headerLabel: string;
  backButtonLabel: string;
  backButtonHref: string;
  headerdescription: string;
  isDisabled: boolean;
  showSocial?: boolean;
  footerContent?: React.ReactNode;
}

export const CardWrapper = ({
  children,
  headerLabel,
  headerdescription,
  backButtonLabel,
  backButtonHref,
  isDisabled,
  showSocial = true,
  footerContent,
}: CardWrapperProps) => {
  return (
    <section className="flex h-screen items-center justify-center my-8 mx-4">
      <Card className="w-[380px] shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{headerLabel}</CardTitle>
          <CardDescription>{headerdescription}</CardDescription>
        </CardHeader>
        <CardContent className="pb-0">{children}</CardContent>
        <CardFooter className="flex-col pb-0">
          {showSocial && <Social disabled={isDisabled} />}
          <div className="pt-2.5 pb-1">
            <BackButton href={backButtonHref} label={backButtonLabel} />
          </div>
          {footerContent}
        </CardFooter>
        {/* <CardFooter className="pb-6"></CardFooter> */}
      </Card>
    </section >
  );
};
