const PROGRAMS: Record<string, string> = {
  "canton-foundation/canton-dev-fund": "Canton Dev Fund",
  "w3f/grant-milestone-delivery": "Web3 Foundation Grants",
  "filecoin-project/devgrants": "Filecoin Dev Grants",
};

export const programOf = (threadRepo: string) => PROGRAMS[threadRepo.toLowerCase()] ?? threadRepo;
