const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("Testing Voting", function () {
  // ::::::::::::: FIXTURES ::::::::::::: //

  async function deployVotingFixture() {
    const [owner, addr1, addr2, addr3, unKnownVoter] =
      await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();
    return { voting, owner, addr1, addr2, addr3, unKnownVoter };
  }

  async function deployVotingWithVotersFixture() {
    // avec voters enregistrés
    const { voting, owner, addr1, addr2, addr3, unKnownVoter } =
      await loadFixture(deployVotingFixture);
    await voting.addVoter(addr1.address);
    await voting.addVoter(addr2.address);
    await voting.addVoter(addr3.address);
    return { voting, owner, addr1, addr2, addr3, unKnownVoter };
  }

  async function deployVotingProposalsStartedFixture() {
    const { voting, owner, addr1, addr2, addr3, unKnownVoter } =
      await loadFixture(deployVotingWithVotersFixture);
    await voting.startProposalsRegistering();
    return { voting, owner, addr1, addr2, addr3, unKnownVoter };
  }

  async function deployVotingWithProposalsFixture() {
    //avec propositions enregistrées
    const { voting, owner, addr1, addr2, addr3, unKnownVoter } =
      await loadFixture(deployVotingProposalsStartedFixture);
    await voting.connect(addr1).addProposal("Proposition 1");
    await voting.connect(addr2).addProposal("Proposition 2");
    await voting.connect(addr3).addProposal("Proposition 3");
    return { voting, owner, addr1, addr2, addr3, unKnownVoter };
  }

  async function deployVotingSessionStartedFixture() {
    const { voting, owner, addr1, addr2, addr3, unKnownVoter } =
      await loadFixture(deployVotingWithProposalsFixture);
    await voting.endProposalsRegistering();
    await voting.startVotingSession();
    return { voting, owner, addr1, addr2, addr3, unKnownVoter };
  }

  async function deployVotingWithVotesFixture() {
    //avec des votes enregistrés
    const { voting, owner, addr1, addr2, addr3, unKnownVoter } =
      await loadFixture(deployVotingSessionStartedFixture);
    await voting.connect(addr1).setVote(1); // Vote pour "Proposition 1"
    await voting.connect(addr2).setVote(1); // Vote pour "Proposition 1"
    await voting.connect(addr3).setVote(2); // Vote pour "Proposition 2"
    return { voting, owner, addr1, addr2, addr3, unKnownVoter };
  }

  // ::::::::::::: TESTS DE DÉPLOIEMENT ::::::::::::: //

  describe("Deploy", function () {
    it("Should deploy with correct initial state", async function () {
      //etat initial
      const { voting } = await loadFixture(deployVotingFixture);
      expect(await voting.workflowStatus()).to.equal(0); // RegisteringVoters
      expect(await voting.winningProposalID()).to.equal(0);
    });

    it("Should set owner correctly", async function () {
      //set owner = owner.address
      const { voting, owner } = await loadFixture(deployVotingFixture);
      expect(await voting.owner()).to.equal(owner.address);
    });
  });

  // ::::::::::::: TESTS D'ENREGISTREMENT DES VOTANTS ::::::::::::: //

  describe("Voter Registration", function () {
    it("Should register a voter", async function () {
      const { voting, addr1 } = await loadFixture(deployVotingFixture);
      await voting.addVoter(addr1.address);

      const voter = await voting.connect(addr1).getVoter(addr1.address);
      expect(voter.isRegistered).to.be.true;
      expect(voter.hasVoted).to.be.false;
      expect(voter.votedProposalId).to.equal(0);
    });

    it("Should emit VoterRegistered event", async function () {
      const { voting, addr1 } = await loadFixture(deployVotingFixture);
      await expect(voting.addVoter(addr1.address))
        .to.emit(voting, "VoterRegistered")
        .withArgs(addr1.address);
    });

    it("Should not register same voter twice", async function () {
      const { voting, addr1 } = await loadFixture(deployVotingFixture);
      await voting.addVoter(addr1.address);

      await expect(voting.addVoter(addr1.address)).to.be.revertedWith(
        "Already registered"
      );
    });

    it("Should not allow non-owner to register voters", async function () {
      const { voting, addr1, addr2 } = await loadFixture(deployVotingFixture);

      await expect(
        voting.connect(addr1).addVoter(addr2.address)
      ).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");
    });

    it("Should not register voters in wrong workflow status", async function () {
      const { voting, addr1, addr2 } = await loadFixture(
        deployVotingWithVotersFixture
      );
      await voting.startProposalsRegistering();

      await expect(voting.addVoter(addr2.address)).to.be.revertedWith(
        "Voters registration is not open yet"
      );
    });
  });

  // ::::::::::::: TESTS DE GESTION DES PROPOSITIONS ::::::::::::: //

  describe("Proposals Registration", function () {
    it("Should start proposals registration", async function () {
      const { voting } = await loadFixture(deployVotingWithVotersFixture);
      await voting.startProposalsRegistering();

      expect(await voting.workflowStatus()).to.equal(1); // ProposalsRegistrationStarted
    });

    it("Should emit WorkflowStatusChange when starting proposals registration", async function () {
      const { voting } = await loadFixture(deployVotingWithVotersFixture);

      await expect(voting.startProposalsRegistering())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(0, 1); // previous status : RegisteringVoters -> newSatuts : ProposalsRegistrationStarted
    });

    it("Should create GENESIS proposal when starting registration", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingWithVotersFixture
      );
      await voting.startProposalsRegistering();

      const genesisProposal = await voting.connect(addr1).getOneProposal(0);
      expect(genesisProposal.description).to.equal("GENESIS");
      expect(genesisProposal.voteCount).to.equal(0);
    });

    it("Should add a proposal", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingProposalsStartedFixture
      );
      await voting.connect(addr1).addProposal("Ma proposition");

      const proposal = await voting.connect(addr1).getOneProposal(1);
      expect(proposal.description).to.equal("Ma proposition");
      expect(proposal.voteCount).to.equal(0);
    });

    it("Should emit ProposalRegistered event", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingProposalsStartedFixture
      );

      await expect(voting.connect(addr1).addProposal("Ma proposition"))
        .to.emit(voting, "ProposalRegistered")
        .withArgs(1); // Index 1 car GENESIS est à l'index 0
    });

    it("Should not allow empty proposal", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingProposalsStartedFixture
      );

      await expect(voting.connect(addr1).addProposal("")).to.be.revertedWith(
        "Vous ne pouvez pas ne rien proposer"
      );
    });

    it("Should not allow non-voters to add proposals", async function () {
      const { voting, unKnownVoter } = await loadFixture(
        deployVotingProposalsStartedFixture
      );

      await expect(
        voting.connect(unKnownVoter).addProposal("Proposition")
      ).to.be.revertedWith("You're not a voter");
    });

    it("Should not add proposals in wrong workflow status", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingWithVotersFixture
      );

      await expect(
        voting.connect(addr1).addProposal("Proposition")
      ).to.be.revertedWith("Proposals are not allowed yet");
    });

    it("Should end proposals registration", async function () {
      const { voting } = await loadFixture(deployVotingProposalsStartedFixture);
      await voting.endProposalsRegistering();

      expect(await voting.workflowStatus()).to.equal(2); // ProposalsRegistrationEnded
    });
  });

  // ::::::::::::: TESTS DE VOTE ::::::::::::: //

  describe("Voting Session", function () {
    it("Should start voting session", async function () {
      const { voting } = await loadFixture(deployVotingWithProposalsFixture);
      await voting.endProposalsRegistering();
      await voting.startVotingSession();

      expect(await voting.workflowStatus()).to.equal(3); // VotingSessionStarted
    });

    it("Should set vote and increment vote count", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingSessionStartedFixture
      );
      await voting.connect(addr1).setVote(1);

      const voter = await voting.connect(addr1).getVoter(addr1.address);
      expect(voter.hasVoted).to.be.true;
      expect(voter.votedProposalId).to.equal(1);

      const proposal = await voting.connect(addr1).getOneProposal(1);
      expect(proposal.voteCount).to.equal(1);
    });

    it("Should emit Voted event", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingSessionStartedFixture
      );

      await expect(voting.connect(addr1).setVote(1))
        .to.emit(voting, "Voted")
        .withArgs(addr1.address, 1);
    });

    it("Should not vote twice", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingSessionStartedFixture
      );
      await voting.connect(addr1).setVote(1);

      await expect(voting.connect(addr1).setVote(2)).to.be.revertedWith(
        "You have already voted"
      );
    });

    it("Should not vote for non-existent proposal", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingSessionStartedFixture
      );

      voteOutOfRange = 500;
      await expect(
        voting.connect(addr1).setVote(voteOutOfRange)
      ).to.be.revertedWith("Proposal not found");
    });

    it("Should not allow non-voters to vote", async function () {
      const { voting, unKnownVoter } = await loadFixture(
        deployVotingSessionStartedFixture
      );

      await expect(voting.connect(unKnownVoter).setVote(1)).to.be.revertedWith(
        "You're not a voter"
      );
    });

    it("Should end voting session", async function () {
      const { voting } = await loadFixture(deployVotingSessionStartedFixture);
      await voting.endVotingSession();

      expect(await voting.workflowStatus()).to.equal(4); // VotingSessionEnded
    });
  });

  // ::::::::::::: TESTS DE COMPTAGE DES VOTES ::::::::::::: //

  describe("Vote Tallying", function () {
    it("Should tally votes and determine winner", async function () {
      const { voting } = await loadFixture(deployVotingWithVotesFixture);
      await voting.endVotingSession();
      await voting.tallyVotes();

      expect(await voting.winningProposalID()).to.equal(1); // "Proposition 1" avec 2 votes
      expect(await voting.workflowStatus()).to.equal(5); // VotesTallied
    });

    it("Should emit WorkflowStatusChange when tallying votes", async function () {
      const { voting } = await loadFixture(deployVotingWithVotesFixture);
      await voting.endVotingSession();

      await expect(voting.tallyVotes())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(4, 5); // VotingSessionEnded -> VotesTallied
    });

    it("Should not tally votes in wrong workflow status", async function () {
      const { voting } = await loadFixture(deployVotingSessionStartedFixture);

      await expect(voting.tallyVotes()).to.be.revertedWith(
        "Current status is not voting session ended"
      );
    });
  });

  // ::::::::::::: TESTS DES GETTERS ::::::::::::: //

  describe("Getters", function () {
    it("Should get voter information", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingWithVotersFixture
      );

      const voter = await voting.connect(addr1).getVoter(addr1.address);
      expect(voter.isRegistered).to.be.true;
      expect(voter.hasVoted).to.be.false;
    });

    it("Should not allow non-voters to get voter information", async function () {
      const { voting, unKnownVoter, addr1 } = await loadFixture(
        deployVotingWithVotersFixture
      );

      await expect(
        voting.connect(unKnownVoter).getVoter(addr1.address)
      ).to.be.revertedWith("You're not a voter");
    });

    it("Should get proposal information", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingWithProposalsFixture
      );

      const proposal = await voting.connect(addr1).getOneProposal(1);
      expect(proposal.description).to.equal("Proposition 1");
      expect(proposal.voteCount).to.equal(0);
    });
  });

  // ::::::::::::: TESTS DE WORKFLOW ::::::::::::: //

  describe("Complete Workflow", function () {
    it("Should have voters registered in fixture", async function () {
      const { voting, addr1 } = await loadFixture(
        deployVotingWithVotersFixture
      );
      const voter = await voting.connect(addr1).getVoter(addr1.address);
      expect(voter.isRegistered).to.be.true;
    });

    it("Should start proposals registration from voters fixture", async function () {
      const { voting } = await loadFixture(deployVotingWithVotersFixture);
      await voting.startProposalsRegistering();
      expect(await voting.workflowStatus()).to.equal(1);
    });

    it("Should follow complete workflow from start to end", async function () {
      const { voting, addr1, addr2, addr3 } = await loadFixture(
        deployVotingWithVotersFixture
      );

      // Start proposals
      await voting.startProposalsRegistering();
      await voting.connect(addr1).addProposal("Test Proposal 1");
      await voting.connect(addr2).addProposal("Test Proposal 2");

      // End proposals and start voting
      await voting.endProposalsRegistering();
      await voting.startVotingSession();

      // Multiple votes
      await voting.connect(addr1).setVote(1); // Vote pour "Test Proposal 1"
      await voting.connect(addr2).setVote(1); // Vote pour "Test Proposal 1"
      await voting.connect(addr3).setVote(2); // Vote pour "Test Proposal 2"

      // End voting and tally
      await voting.endVotingSession();
      await voting.tallyVotes();

      expect(await voting.workflowStatus()).to.equal(5);
      expect(await voting.winningProposalID()).to.equal(1); // "Test Proposal 1" gagne avec 2 votes
    });
  });
});
