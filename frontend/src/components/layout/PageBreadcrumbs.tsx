import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbConfig {
  label: ReactNode;
  to?: string;
  key?: string;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbConfig[];
  className?: string;
}

export function PageBreadcrumbs({ items, className }: PageBreadcrumbsProps) {
  if (!items.length) {
    return null;
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={item.key ?? `${typeof item.label === "string" ? item.label : index}-${index}`}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.to ? (
                <BreadcrumbLink asChild>
                  <Link to={item.to}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export type { BreadcrumbConfig };
