"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Trash2, 
  LogOut, 
  UserMinus, 
  X 
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmDialogOptions {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "success" | "primary";
  icon?: "trash" | "alert" | "check" | "info" | "user-minus" | "logout";
}

export interface AlertDialogOptions {
  title?: string;
  message: React.ReactNode;
  buttonText?: string;
  type?: "success" | "error" | "warning" | "info";
  icon?: "alert" | "check" | "info";
}

interface DialogContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showConfirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  showAlert: (options: AlertDialogOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  // Toasts State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Confirm Dialog State
  const [confirmConfig, setConfirmConfig] = useState<ConfirmDialogOptions | null>(null);
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);

  // Alert Dialog State
  const [alertConfig, setAlertConfig] = useState<AlertDialogOptions | null>(null);
  const alertResolveRef = useRef<(() => void) | null>(null);

  // Show Toast
  const showToast = useCallback((message: string, type: ToastType = "info", duration = 2000) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Show Confirm (Promise based)
  const showConfirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmConfig(options);
    });
  }, []);

  const handleConfirmAction = (result: boolean) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(result);
      confirmResolveRef.current = null;
    }
    setConfirmConfig(null);
  };

  // Show Alert (Promise based)
  const showAlert = useCallback((options: AlertDialogOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      alertResolveRef.current = resolve;
      if (typeof options === "string") {
        setAlertConfig({
          title: "Informasi",
          message: options,
          buttonText: "Mengerti",
          type: "info",
        });
      } else {
        setAlertConfig(options);
      }
    });
  }, []);

  const handleAlertClose = () => {
    if (alertResolveRef.current) {
      alertResolveRef.current();
      alertResolveRef.current = null;
    }
    setAlertConfig(null);
  };

  // Render Icon Helper for Confirm Dialog
  const renderConfirmIcon = () => {
    const type = confirmConfig?.type || "primary";
    const iconName = confirmConfig?.icon;

    if (iconName === "trash") return <Trash2 className="w-7 h-7" strokeWidth={2.2} />;
    if (iconName === "user-minus") return <UserMinus className="w-7 h-7" strokeWidth={2.2} />;
    if (iconName === "logout") return <LogOut className="w-7 h-7" strokeWidth={2.2} />;
    if (iconName === "check") return <CheckCircle2 className="w-7 h-7" strokeWidth={2.2} />;
    if (iconName === "info") return <Info className="w-7 h-7" strokeWidth={2.2} />;
    if (iconName === "alert") return <AlertTriangle className="w-7 h-7" strokeWidth={2.2} />;

    // Default by type
    if (type === "danger") return <Trash2 className="w-7 h-7" strokeWidth={2.2} />;
    if (type === "warning") return <AlertTriangle className="w-7 h-7" strokeWidth={2.2} />;
    if (type === "success") return <CheckCircle2 className="w-7 h-7" strokeWidth={2.2} />;
    return <Info className="w-7 h-7" strokeWidth={2.2} />;
  };

  const getConfirmIconBoxClasses = () => {
    const type = confirmConfig?.type || "primary";
    switch (type) {
      case "danger":
        return "bg-red-50 border border-red-100 text-red-600";
      case "warning":
        return "bg-amber-50 border border-amber-100 text-amber-600";
      case "success":
        return "bg-[#E8F3EB] border border-[#D1E5D5] text-[#356E3B]";
      default:
        return "bg-emerald-50 border border-emerald-100 text-[#356E3B]";
    }
  };

  const getConfirmButtonClasses = () => {
    const type = confirmConfig?.type || "primary";
    switch (type) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20";
      case "success":
      default:
        return "bg-[#356E3B] hover:bg-[#2A582F] text-white shadow-md shadow-[#356E3B]/20";
    }
  };

  return (
    <DialogContext.Provider value={{ showToast, showConfirm, showAlert }}>
      {children}

      {/* 1. TOAST NOTIFICATIONS CONTAINER */}
      {toasts.length > 0 && (
        <div className="fixed top-4 inset-x-0 z-[250] pointer-events-none flex flex-col items-center gap-2 px-4 max-w-md mx-auto">
          {toasts.map((toast) => {
            const isSuccess = toast.type === "success";
            const isError = toast.type === "error";
            const isWarning = toast.type === "warning";

            return (
              <div
                key={toast.id}
                className={`pointer-events-auto flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.06)] border backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-200 transition-all max-w-[92%] ${
                  isSuccess
                    ? "bg-[#EAF5EE] text-[#1E4738] border-[#B8DFC3]"
                    : isError
                    ? "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]"
                    : isWarning
                    ? "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]"
                    : "bg-[#F0FDF4] text-[#1E4738] border-[#B8DFC3]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0">
                    {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" strokeWidth={2.5} />}
                    {isError && <AlertCircle className="w-4 h-4 text-[#DC2626]" strokeWidth={2.5} />}
                    {isWarning && <AlertTriangle className="w-4 h-4 text-[#D97706]" strokeWidth={2.5} />}
                    {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-[#2D6A4F]" strokeWidth={2.5} />}
                  </div>
                  <span className="text-[12.5px] font-semibold leading-tight truncate">
                    {toast.message}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Tutup notifikasi"
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-opacity active:scale-95 ml-0.5 ${
                    isSuccess
                      ? "text-[#1E4738]"
                      : isError
                      ? "text-[#991B1B]"
                      : isWarning
                      ? "text-[#92400E]"
                      : "text-[#1E4738]"
                  }`}
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. CONFIRMATION DIALOG MODAL */}
      {confirmConfig && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5 animate-in fade-in duration-200">
          <div 
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm bg-white rounded-[24px] p-6 flex flex-col items-center text-center gap-4 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200"
          >
            {/* Icon */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${getConfirmIconBoxClasses()}`}>
              {renderConfirmIcon()}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1.5 w-full">
              <h3 className="text-[18px] font-bold text-[#111827] leading-tight">
                {confirmConfig.title}
              </h3>
              <div className="text-[13px] text-gray-500 leading-relaxed px-1">
                {confirmConfig.message}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => handleConfirmAction(false)}
                className="flex-1 py-3 px-4 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-[13px] transition-colors active:scale-95"
              >
                {confirmConfig.cancelText || "Batal"}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAction(true)}
                className={`flex-1 py-3 px-4 rounded-full font-semibold text-[13px] active:scale-95 transition-all ${getConfirmButtonClasses()}`}
              >
                {confirmConfig.confirmText || "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ALERT DIALOG MODAL */}
      {alertConfig && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5 animate-in fade-in duration-200">
          <div 
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm bg-white rounded-[24px] p-6 flex flex-col items-center text-center gap-4 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200"
          >
            {/* Icon */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
              alertConfig.type === "error"
                ? "bg-red-50 border border-red-100 text-red-600"
                : alertConfig.type === "warning"
                ? "bg-amber-50 border border-amber-100 text-amber-600"
                : alertConfig.type === "success"
                ? "bg-[#E8F3EB] border border-[#D1E5D5] text-[#356E3B]"
                : "bg-emerald-50 border border-emerald-100 text-[#356E3B]"
            }`}>
              {alertConfig.type === "error" ? (
                <AlertCircle className="w-7 h-7" strokeWidth={2.2} />
              ) : alertConfig.type === "warning" ? (
                <AlertTriangle className="w-7 h-7" strokeWidth={2.2} />
              ) : alertConfig.type === "success" ? (
                <CheckCircle2 className="w-7 h-7" strokeWidth={2.2} />
              ) : (
                <Info className="w-7 h-7" strokeWidth={2.2} />
              )}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1.5 w-full">
              <h3 className="text-[18px] font-bold text-[#111827] leading-tight">
                {alertConfig.title || "Informasi"}
              </h3>
              <div className="text-[13px] text-gray-500 leading-relaxed px-1">
                {alertConfig.message}
              </div>
            </div>

            {/* Button */}
            <button
              type="button"
              onClick={handleAlertClose}
              className="w-full py-3.5 px-4 rounded-full bg-[#356E3B] hover:bg-[#2A582F] text-white font-bold text-[14px] shadow-md shadow-[#356E3B]/20 transition-all active:scale-95 mt-2"
            >
              {alertConfig.buttonText || "Mengerti"}
            </button>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}
