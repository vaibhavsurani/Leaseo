import { jsPDF } from "jspdf";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

declare module "jspdf-autotable" {
  interface UserOptions {
    startY?: number;
    head?: string[][];
    body?: string[][];
    theme?: "striped" | "grid" | "plain";
    headStyles?: {
      fillColor?: number[];
      textColor?: number[];
      fontSize?: number;
      fontStyle?: string;
      halign?: "left" | "center" | "right";
    };
    bodyStyles?: {
      fontSize?: number;
      cellPadding?: number;
    };
    columnStyles?: {
      [key: number]: {
        cellWidth?: number;
        halign?: "left" | "center" | "right";
      };
    };
    margin?: {
      left?: number;
      right?: number;
      top?: number;
      bottom?: number;
    };
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void;
}
