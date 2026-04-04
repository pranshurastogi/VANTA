"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CreditCard, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TransactionItem {
  id: string;
  name: string;
  type: string;
  amount: number;
  date: string;
  time: string;
  icon: React.ReactNode;
  paymentMethod: string;
  cardLastFour: string;
  cardType?: string;
}

const MasterCardLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1.29em" height="1em" viewBox="0 0 256 199">
    <path
      fill="currentColor"
      d="M93.298 16.903h69.15v124.251h-69.15z"
    />
    <path
      fill="currentColor"
      d="M97.689 79.029c0-25.245 11.854-47.637 30.074-62.126C114.373 6.366 97.47 0 79.03 0C35.343 0 0 35.343 0 79.029s35.343 79.029 79.029 79.029c18.44 0 35.343-6.366 48.734-16.904c-18.22-14.269-30.074-36.88-30.074-62.125"
    />
    <path
      fill="currentColor"
      d="M255.746 79.029c0 43.685-35.343 79.029-79.029 79.029c-18.44 0-35.343-6.366-48.734-16.904c18.44-14.488 30.075-36.88 30.075-62.125s-11.855-47.637-30.075-62.126C141.373 6.366 158.277 0 176.717 0c43.686 0 79.03 35.563 79.03 79.029"
    />
  </svg>
);

const VisaLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="3.09em" height="1em" viewBox="0 0 256 83">
    <defs>
      <linearGradient id="logosVisa0" x1="45.974%" x2="54.877%" y1="-2.006%" y2="100%">
        <stop offset="0%" stopColor="gray" />
        <stop offset="100%" stopColor="gray" />
      </linearGradient>
    </defs>
    <path
      fill="url(#logosVisa0)"
      d="M132.397 56.24c-.146-11.516 10.263-17.942 18.104-21.763c8.056-3.92 10.762-6.434 10.73-9.94c-.06-5.365-6.426-7.733-12.383-7.825c-10.393-.161-16.436 2.806-21.24 5.05l-3.744-17.519c4.82-2.221 13.745-4.158 23-4.243c21.725 0 35.938 10.724 36.015 27.351c.085 21.102-29.188 22.27-28.988 31.702c.069 2.86 2.798 5.912 8.778 6.688c2.96.392 11.131.692 20.395-3.574l3.636 16.95c-4.982 1.814-11.385 3.551-19.357 3.551c-20.448 0-34.83-10.87-34.946-26.428m89.241 24.968c-3.967 0-7.31-2.314-8.802-5.865L181.803 1.245h21.709l4.32 11.939h26.528l2.506-11.939H256l-16.697 79.963zm3.037-21.601l6.265-30.027h-17.158zm-118.599 21.6L88.964 1.246h20.687l17.104 79.963zm-30.603 0L53.941 26.782l-8.71 46.277c-1.022 5.166-5.058 8.149-9.54 8.149H.493L0 78.886c7.226-1.568 15.436-4.097 20.41-6.803c3.044-1.653 3.912-3.098 4.912-7.026L41.819 1.245H63.68l33.516 79.963z"
      transform="matrix(1 0 0 -1 0 82.668)"
    />
  </svg>
);

const TransactionList = ({ transactions }: { transactions: TransactionItem[] }) => {
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);

  return (
    <div className="mx-auto max-w-md font-sans">
      <motion.div
        layout
        className="w-[350px] overflow-hidden rounded-3xl bg-background text-foreground shadow"
        initial={{ height: 420, width: 300 }}
        animate={{
          height: selectedTransaction ? 350 : 420,
          width: 300,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <AnimatePresence mode="wait">
          {!selectedTransaction ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="pl-6 pt-3 text-xl font-semibold text-muted-foreground">
                Transactions
              </h2>
              <div className="space-y-2 p-2">
                {transactions.map((transaction) => (
                  <motion.div
                    key={transaction.id}
                    layoutId={`transaction-${transaction.id}`}
                    className="flex cursor-pointer items-center justify-between rounded-lg p-1 hover:bg-accent"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <div className="flex items-center space-x-3">
                      <motion.div
                        layoutId={`icon-${transaction.id}`}
                        className="rounded-full bg-foreground text-background"
                        transition={{ duration: 0.5 }}
                      >
                        {transaction.icon}
                      </motion.div>
                      <div>
                        <motion.p
                          layoutId={`name-${transaction.id}`}
                          className="font-medium text-foreground"
                        >
                          {transaction.name}
                        </motion.p>
                        <motion.p
                          layoutId={`type-${transaction.id}`}
                          className="text-sm text-muted-foreground"
                        >
                          {transaction.type}
                        </motion.p>
                      </div>
                    </div>
                    <motion.p
                      layoutId={`amount-${transaction.id}`}
                      className="font-bold text-muted-foreground"
                    >
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </motion.p>
                  </motion.div>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="m-auto mt-4 flex w-11/12 items-center justify-center rounded-xl bg-accent text-accent-foreground py-2"
              >
                All Transactions <ArrowRight className="ml-2 h-4 w-4" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <motion.div
                  layoutId={`transaction-${selectedTransaction.id}`}
                  className="flex items-center space-x-3"
                >
                  <motion.div
                    layoutId={`icon-${selectedTransaction.id}`}
                    className="rounded-xl bg-foreground text-background"
                    transition={{ duration: 0.5 }}
                  >
                    {selectedTransaction.icon}
                  </motion.div>
                </motion.div>
                <button onClick={() => setSelectedTransaction(null)}>
                  <X className="h-6 w-6 rounded-full bg-muted-foreground text-muted" />
                </button>
              </div>
              <div className="flex justify-between border-b border-dashed border-border pb-4">
                <div className="space-y-1">
                  <motion.p
                    layoutId={`name-${selectedTransaction.id}`}
                    className="font-medium text-foreground"
                  >
                    {selectedTransaction.name}
                  </motion.p>
                  <motion.p
                    layoutId={`type-${selectedTransaction.id}`}
                    className="text-sm text-muted-foreground"
                  >
                    {selectedTransaction.type}
                  </motion.p>
                </div>
                <motion.p
                  layoutId={`amount-${selectedTransaction.id}`}
                  className="font-bold text-muted-foreground"
                >
                  ${Math.abs(selectedTransaction.amount).toFixed(2)}
                </motion.p>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="mt-4 space-y-2 text-muted-foreground">
                  <p>#{selectedTransaction.id}</p>
                  <p>{selectedTransaction.date}</p>
                  <p>{selectedTransaction.time}</p>
                </div>
                <div className="border-t border-dashed border-border pt-4 text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Paid Via {selectedTransaction.paymentMethod}
                  </p>
                  <div className="mt-2 flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-foreground" />
                    <p className="text-foreground">XXXX {selectedTransaction.cardLastFour}</p>
                    <p className="text-foreground">
                      {selectedTransaction.cardType === "visa" ? <VisaLogo /> : <MasterCardLogo />}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default TransactionList;
export { TransactionList };
