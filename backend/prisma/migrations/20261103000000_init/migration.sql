BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[Admin] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [passwordHash] NVARCHAR(255) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Admin_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Admin_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Admin_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[InvitationCode] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [code] NVARCHAR(32) NOT NULL,
    [status] NVARCHAR(16) NOT NULL CONSTRAINT [InvitationCode_status_df] DEFAULT 'UNUSED',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InvitationCode_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [redeemedAt] DATETIME2,
    [revokedAt] DATETIME2,
    CONSTRAINT [InvitationCode_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [InvitationCode_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Guest] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [fullName] NVARCHAR(120) NOT NULL,
    [phoneNumber] NVARCHAR(32) NOT NULL,
    [email] NVARCHAR(255),
    [numberOfAttendees] INT NOT NULL,
    [attendanceStatus] NVARCHAR(16) NOT NULL,
    [dietaryRequirements] NVARCHAR(500),
    [specialMessage] NVARCHAR(2000),
    [invitationCodeId] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Guest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Guest_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Guest_invitationCodeId_key] UNIQUE NONCLUSTERED ([invitationCodeId])
);

-- CreateTable
CREATE TABLE [dbo].[InvitationSession] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [tokenHash] NVARCHAR(64) NOT NULL,
    [invitationCodeId] UNIQUEIDENTIFIER NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [consumedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InvitationSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [InvitationSession_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [InvitationSession_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InvitationCode_status_createdAt_idx] ON [dbo].[InvitationCode]([status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Guest_attendanceStatus_idx] ON [dbo].[Guest]([attendanceStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Guest_createdAt_idx] ON [dbo].[Guest]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Guest_fullName_idx] ON [dbo].[Guest]([fullName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InvitationSession_invitationCodeId_idx] ON [dbo].[InvitationSession]([invitationCodeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InvitationSession_expiresAt_idx] ON [dbo].[InvitationSession]([expiresAt]);

-- AddForeignKey
ALTER TABLE [dbo].[Guest] ADD CONSTRAINT [Guest_invitationCodeId_fkey] FOREIGN KEY ([invitationCodeId]) REFERENCES [dbo].[InvitationCode]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InvitationSession] ADD CONSTRAINT [InvitationSession_invitationCodeId_fkey] FOREIGN KEY ([invitationCodeId]) REFERENCES [dbo].[InvitationCode]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Data-integrity CHECK constraints (SQL Server has no Prisma enums)
ALTER TABLE [dbo].[InvitationCode] ADD CONSTRAINT [InvitationCode_status_chk] CHECK ([status] IN (N'UNUSED', N'USED', N'REVOKED'));
ALTER TABLE [dbo].[Guest] ADD CONSTRAINT [Guest_attendanceStatus_chk] CHECK ([attendanceStatus] IN (N'ATTENDING', N'NOT_ATTENDING'));
ALTER TABLE [dbo].[Guest] ADD CONSTRAINT [Guest_numberOfAttendees_chk] CHECK ([numberOfAttendees] >= 0 AND [numberOfAttendees] <= 50);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

