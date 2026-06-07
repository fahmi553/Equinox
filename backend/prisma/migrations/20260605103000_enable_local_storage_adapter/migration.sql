UPDATE "ModuleSetting"
SET "isEnabled" = true,
    "healthState" = 'available'
WHERE "key" = 'storage';

UPDATE "IntegrationSetting"
SET "isEnabled" = true,
    "healthState" = 'available'
WHERE "key" = 'local-storage';
