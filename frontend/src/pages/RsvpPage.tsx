import { useEffect, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy, FileText, Trash2, Upload } from "lucide-react";
import Monogram from "../components/Monogram";
import { api, ApiError } from "../lib/api";

const rsvpSchema = z
  .object({
    fullName: z.string().min(2, "Please enter your full name."),
    phoneNumber: z.string().min(7, "Please enter a valid phone number."),
    email: z.string().email("Please enter a valid email.").optional().or(z.literal("")),
    numberOfGuests: z.coerce.number().int().min(1).max(1),
    attendanceStatus: z.enum(["ATTENDING", "NOT_ATTENDING"]),
    capGeleInterest: z.enum(["NONE", "CAP", "GELE"]),
    paymentProof: z.string().optional(),
    paymentProofName: z.string().optional(),
    paymentSenderName: z.string().optional(),
    dietaryRequirements: z.string().optional(),
    specialMessage: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (
      val.attendanceStatus === "ATTENDING" &&
      (val.capGeleInterest === "CAP" || val.capGeleInterest === "GELE")
    ) {
      if (!val.paymentSenderName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentSenderName"],
          message: "Please enter the account/sender name on the bank transfer.",
        });
      }
      if (!val.paymentProof) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentProof"],
          message: "Please upload your proof of payment for the selected cap or gele.",
        });
      }
    }
  });

type RsvpInput = z.input<typeof rsvpSchema>;
type RsvpOutput = z.output<typeof rsvpSchema>;

/** Reads an uploaded receipt image or PDF and returns a compact data URL. */
async function fileToDataUrl(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    if (file.size > 3 * 1024 * 1024) {
      throw new Error("PDF must be under 3 MB. Please upload a smaller PDF or a screenshot.");
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsDataURL(file);
    });
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image (JPG, PNG, WebP) or a PDF receipt.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Image is too large (max 12 MB).");
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });

  // Compress large images on a canvas so mobile uploads are fast and under the payload limit.
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1400;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(rawDataUrl);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export default function RsvpPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RsvpInput, unknown, RsvpOutput>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      attendanceStatus: "ATTENDING",
      numberOfGuests: 1,
      capGeleInterest: "NONE",
      paymentProof: "",
      paymentProofName: "",
      paymentSenderName: "",
    },
  });

  const attendance = watch("attendanceStatus");
  const capGele = watch("capGeleInterest");
  const paymentProof = watch("paymentProof");
  const paymentProofName = watch("paymentProofName");
  const [formError, setFormError] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // The RSVP form requires a live invitation session; otherwise send guests back to the code page.
  useEffect(() => {
    api("/invitations/session").catch(() => navigate("/invitation", { replace: true }));
  }, [navigate]);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileBusy(true);
    clearErrors("paymentProof");
    try {
      const dataUrl = await fileToDataUrl(file);
      setValue("paymentProof", dataUrl, { shouldValidate: true });
      setValue("paymentProofName", file.name);
    } catch (err) {
      setValue("paymentProof", "");
      setValue("paymentProofName", "");
      setError("paymentProof", {
        message: err instanceof Error ? err.message : "Could not process file.",
      });
    } finally {
      setFileBusy(false);
      e.target.value = "";
    }
  }

  function clearProof() {
    setValue("paymentProof", "");
    setValue("paymentProofName", "");
  }

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText("7032026987");
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function onSubmit(values: RsvpOutput) {
    setFormError("");
    try {
      await api("/guests/rsvp", { method: "POST", body: values });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/invitation", { replace: true });
        return;
      }
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          setError(field as keyof RsvpInput, { message });
        }
      }
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return;
    }
    navigate("/confirmation", { state: { attendanceStatus: values.attendanceStatus, fullName: values.fullName } });
  }

  const inputClass =
    "w-full bg-ivory border border-plum/20 rounded-sm px-4 py-3 font-sans text-deep-plum placeholder:text-plum/35 focus:border-olive transition-colors";
  const labelClass = "block font-sans text-sm text-deep-plum/80 mb-2";
  const errorClass = "mt-1.5 text-xs text-plum font-sans";

  return (
    <div className="min-h-screen bg-ivory">
      <header className="px-6 sm:px-10 py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-3 text-deep-plum">
          <Monogram className="w-8 h-8" />
        </Link>
        <Link to="/invitation" className="inline-flex items-center gap-2 font-sans text-sm text-deep-plum/70 hover:text-plum transition-colors">
          <ArrowLeft size={16} />
          Back
        </Link>
      </header>

      <main className="px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl mx-auto"
        >
          <p className="font-sans text-xs tracking-[0.3em] text-olive text-center mb-4">
            YOUR RSVP
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-deep-plum text-center mb-3">
            We&rsquo;d Love to Know
          </h1>
          <p className="font-sans text-sm text-deep-plum/65 text-center mb-10 leading-relaxed max-w-md mx-auto">
            A few details so we can prepare a seat, and a plate, with your name on it.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div>
              <label htmlFor="fullName" className={labelClass}>Full Name</label>
              <input id="fullName" className={inputClass} {...register("fullName")} />
              {errors.fullName && <p className={errorClass}>{errors.fullName.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="phoneNumber" className={labelClass}>Phone Number</label>
                <input id="phoneNumber" type="tel" className={inputClass} {...register("phoneNumber")} />
                {errors.phoneNumber && <p className={errorClass}>{errors.phoneNumber.message}</p>}
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>Email Address <span className="text-deep-plum/40">(optional)</span></label>
                <input id="email" type="email" className={inputClass} {...register("email")} />
                {errors.email && <p className={errorClass}>{errors.email.message}</p>}
              </div>
            </div>

            <fieldset>
              <legend className={labelClass}>Will you be attending?</legend>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex items-center justify-center gap-2 border rounded-sm px-4 py-3 cursor-pointer font-sans text-sm transition-colors ${
                    attendance === "ATTENDING"
                      ? "border-olive bg-olive/10 text-deep-olive"
                      : "border-plum/20 text-deep-plum/60"
                  }`}
                >
                  <input type="radio" value="ATTENDING" className="sr-only" {...register("attendanceStatus")} />
                  Joyfully Attending
                </label>
                <label
                  className={`flex items-center justify-center gap-2 border rounded-sm px-4 py-3 cursor-pointer font-sans text-sm transition-colors ${
                    attendance === "NOT_ATTENDING"
                      ? "border-plum bg-plum/10 text-plum"
                      : "border-plum/20 text-deep-plum/60"
                  }`}
                >
                  <input type="radio" value="NOT_ATTENDING" className="sr-only" {...register("attendanceStatus")} />
                  Unable to Attend
                </label>
              </div>
            </fieldset>

            {attendance === "ATTENDING" && (
              <>
                <div>
                  <label htmlFor="numberOfGuests" className={labelClass}>Number of Guests</label>
                  <input
                    id="numberOfGuests"
                    type="number"
                    value={1}
                    readOnly
                    aria-readonly="true"
                    tabIndex={-1}
                    className={`${inputClass} bg-plum/5 text-deep-plum/60 cursor-not-allowed select-none`}
                    {...register("numberOfGuests")}
                  />
                  {errors.numberOfGuests && <p className={errorClass}>{errors.numberOfGuests.message}</p>}
                </div>

                <fieldset>
                  <legend className={labelClass}>
                    Would you be interested in buying a cap or gele?
                  </legend>
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        ["NONE", "Not interested", ""],
                        ["GELE", "Gele", "₦10,000"],
                        ["CAP", "Cap", "₦7,000"],
                      ] as const
                    ).map(([value, text, price]) => (
                      <label
                        key={value}
                        className={`flex flex-col items-center justify-center text-center border rounded-sm px-2 py-3 cursor-pointer font-sans text-sm transition-colors ${
                          capGele === value ? "border-olive bg-olive/10 text-deep-olive font-medium" : "border-plum/20 text-deep-plum/60"
                        }`}
                      >
                        <input type="radio" value={value} className="sr-only" {...register("capGeleInterest")} />
                        <span>{text}</span>
                        {price && <span className="text-xs text-olive mt-0.5">{price}</span>}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {(capGele === "CAP" || capGele === "GELE") && (
                  <div className="border border-olive/35 bg-olive/5 rounded-sm p-5 space-y-4">
                    <div>
                      <p className="font-sans text-xs tracking-[0.2em] text-olive uppercase mb-1">
                        Payment Details ({capGele === "GELE" ? "Gele — ₦10,000" : "Cap — ₦7,000"})
                      </p>
                      <p className="font-sans text-xs text-deep-plum/70">
                        Kindly make payment into the account below and upload your payment receipt.
                      </p>
                    </div>

                    <div className="bg-ivory border border-plum/15 rounded-sm p-4 space-y-2 font-sans text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-deep-plum/60 text-xs">Amount</span>
                        <span className="font-semibold text-deep-plum">
                          {capGele === "GELE" ? "₦10,000 (Gele)" : "₦7,000 (Cap)"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-deep-plum/60 text-xs">Bank</span>
                        <span className="font-medium text-deep-plum">OPay</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-deep-plum/60 text-xs">Account Number</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-deep-plum tracking-wider">7032026987</span>
                          <button
                            type="button"
                            onClick={copyAccountNumber}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-sm border border-plum/20 text-plum hover:bg-plum/10 transition-colors"
                          >
                            {copiedAccount ? <Check size={12} /> : <Copy size={12} />}
                            {copiedAccount ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-deep-plum/60 text-xs">Account Name</span>
                        <span className="font-medium text-deep-plum">Adetutu Sanwoolu</span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="paymentSenderName" className={labelClass}>
                        Sender Name on Bank Transfer <span className="text-plum">*</span>
                      </label>
                      <input
                        id="paymentSenderName"
                        type="text"
                        placeholder="e.g. Adewale Adeyemi (name on the account you paid from)"
                        className={inputClass}
                        {...register("paymentSenderName")}
                      />
                      <p className="mt-1 text-xs text-deep-plum/50 font-sans">
                        Helps the couple easily identify and verify your transfer.
                      </p>
                      {errors.paymentSenderName && <p className={errorClass}>{errors.paymentSenderName.message}</p>}
                    </div>

                    <div>
                      <label htmlFor="paymentProofInput" className={labelClass}>
                        Upload Proof of Payment <span className="text-plum">*</span>
                      </label>
                      {!paymentProof ? (
                        <label
                          htmlFor="paymentProofInput"
                          className="flex flex-col items-center justify-center gap-2 border border-dashed border-plum/30 bg-ivory hover:border-olive rounded-sm px-4 py-6 cursor-pointer transition-colors text-center"
                        >
                          <Upload size={20} className="text-olive" />
                          <span className="font-sans text-sm text-deep-plum">
                            {fileBusy ? "Processing receipt…" : "Tap to upload payment receipt"}
                          </span>
                          <span className="font-sans text-xs text-deep-plum/50">
                            Screenshot, photo (JPG, PNG) or PDF
                          </span>
                          <input
                            id="paymentProofInput"
                            type="file"
                            accept="image/*,application/pdf"
                            disabled={fileBusy}
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                      ) : (
                        <div className="bg-ivory border border-plum/20 rounded-sm p-3 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 font-sans text-sm text-deep-plum">
                              <FileText size={16} className="text-olive shrink-0" />
                              <span className="truncate">{paymentProofName || "Payment receipt uploaded"}</span>
                            </div>
                            <button
                              type="button"
                              onClick={clearProof}
                              className="inline-flex items-center gap-1 text-xs font-sans text-plum hover:underline shrink-0"
                            >
                              <Trash2 size={14} />
                              Remove
                            </button>
                          </div>
                          {paymentProof.startsWith("data:image/") && (
                            <img
                              src={paymentProof}
                              alt="Uploaded payment receipt preview"
                              className="max-h-48 rounded-sm border border-plum/10 object-contain mx-auto"
                            />
                          )}
                        </div>
                      )}
                      {errors.paymentProof && <p className={errorClass}>{errors.paymentProof.message}</p>}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="dietaryRequirements" className={labelClass}>
                    Dietary Requirements <span className="text-deep-plum/40">(optional)</span>
                  </label>
                  <input id="dietaryRequirements" className={inputClass} {...register("dietaryRequirements")} />
                </div>
              </>
            )}

            <div>
              <label htmlFor="specialMessage" className={labelClass}>
                Special Message to the Couple <span className="text-deep-plum/40">(optional)</span>
              </label>
              <textarea
                id="specialMessage"
                rows={4}
                className={inputClass}
                {...register("specialMessage")}
              />
            </div>

            {formError && (
              <p role="alert" className={errorClass}>
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || fileBusy}
              className="w-full bg-plum text-ivory font-sans font-medium text-sm px-8 py-4 rounded-sm hover:bg-deep-plum transition-colors duration-300 disabled:opacity-60"
            >
              {isSubmitting ? "Submitting…" : "Submit RSVP"}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
