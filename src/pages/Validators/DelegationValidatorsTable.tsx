import React, {useEffect, useMemo, useState} from "react";
import {
  alpha,
  Box,
  Table,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import GeneralTableRow from "../../components/Table/GeneralTableRow";
import GeneralTableHeaderCell from "../../components/Table/GeneralTableHeaderCell";
import {assertNever} from "../../utils";
import GeneralTableBody from "../../components/Table/GeneralTableBody";
import GeneralTableCell from "../../components/Table/GeneralTableCell";
import {useNavigate} from "react-router-dom";
import {Types} from "aptos";
import {
  ValidatorData,
  useGetValidators,
} from "../../api/hooks/useGetValidators";
import CurrencyValue, {
  APTCurrencyValue,
} from "../../components/IndividualPageContent/ContentValue/CurrencyValue";
import {aptosColor, grey, primary} from "../../themes/colors/aptosColorPalette";
import {useGlobalState} from "../../GlobalState";
import {StyledLearnMoreTooltip} from "../../components/StyledTooltip";
import {useGetDelegationNodeInfo} from "../../api/hooks/useGetDelegationNodeInfo";
import {OperatorAddrCell, ValidatorAddrCell} from "./ValidatorsTable";
import {useGetNumberOfDelegators} from "../../api/hooks/useGetNumberOfDelegators";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {useWallet} from "@aptos-labs/wallet-adapter-react";
import {Button} from "@mui/material";
import {useGetDelegatorStakeInfo} from "../../api/hooks/useGetDelegatorStakeInfo";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {Stack} from "@mui/material";
import {useGetDelegatedStakingPoolList} from "../../api/hooks/useGetDelegatedStakingPoolList";
import ValidatorStatusIcon from "../DelegatoryValidator/Components/ValidatorStatusIcon";

function getSortedValidators(
  validators: ValidatorData[],
  column: Column,
  direction: "desc" | "asc",
) {
  const validatorsCopy: ValidatorData[] = JSON.parse(
    JSON.stringify(validators),
  );
  const orderedValidators = getValidatorsOrderedBy(validatorsCopy, column);

  return direction === "desc" ? orderedValidators : orderedValidators.reverse();
}

function getValidatorsOrderedBy(
  validatorsCopy: ValidatorData[],
  column: Column,
) {
  switch (column) {
    case "delegatedAmount":
      return validatorsCopy.sort(
        (validator1, validator2) =>
          parseInt(validator2.voting_power) - parseInt(validator1.voting_power),
      );
    default:
      return validatorsCopy;
  }
}

type SortableHeaderCellProps = {
  header: string;
  column: Column;
  direction?: "desc" | "asc";
  setDirection?: (dir: "desc" | "asc") => void;
  setSortColumn: (col: Column) => void;
  tooltip?: React.ReactNode;
  isTableTooltip?: boolean;
  textAlignRight?: boolean;
};

function SortableHeaderCell({
  header,
  column,
  direction,
  setDirection,
  setSortColumn,
  tooltip,
  isTableTooltip,
  textAlignRight,
}: SortableHeaderCellProps) {
  return (
    <GeneralTableHeaderCell
      header={header}
      textAlignRight={textAlignRight}
      sortable
      direction={direction}
      selectAndSetDirection={(dir) => {
        setSortColumn(column);
        if (setDirection) {
          setDirection(dir);
        }
      }}
      tooltip={tooltip}
      isTableTooltip={isTableTooltip}
    />
  );
}

type ValidatorHeaderCellProps = {
  column: Column;
  direction?: "desc" | "asc";
  setDirection?: (dir: "desc" | "asc") => void;
  setSortColumn: (col: Column) => void;
  connected: boolean;
};

function ValidatorHeaderCell({
  column,
  direction,
  setDirection,
  setSortColumn,
  connected,
}: ValidatorHeaderCellProps) {
  switch (column) {
    case "addr":
      return <GeneralTableHeaderCell header="Staking Pool Address" />;
    case "operatorAddr":
      return <GeneralTableHeaderCell header="Operator Address" />;
    case "delegatedAmount":
      return (
        <GeneralTableHeaderCell
          header="Delegated Amount"
          tooltip={
            <StyledLearnMoreTooltip text="The total amount of delegated stake in this stake pool" />
          }
          isTableTooltip={false}
        />
      );
    case "delegator":
      return (
        <GeneralTableHeaderCell
          header="Delegators"
          tooltip={
            <StyledLearnMoreTooltip
              text="Number of owner accounts who have delegated stake to this stake pool
        Compound rewards"
            />
          }
          isTableTooltip={false}
        />
      );
    case "rewardsEarned":
      return (
        <SortableHeaderCell
          header="Rewards Earned"
          column={column}
          direction={direction}
          setDirection={setDirection}
          setSortColumn={setSortColumn}
          tooltip={
            <StyledLearnMoreTooltip text="Amount of rewards earned by this stake pool to date" />
          }
          isTableTooltip={false}
          textAlignRight={!connected}
        />
      );
    case "commission":
      return (
        <GeneralTableHeaderCell
          header="Commission"
          tooltip={
            <StyledLearnMoreTooltip text="% of staking reward paid out to operator as commission" />
          }
          isTableTooltip={false}
        />
      );
    case "view":
      return (
        <GeneralTableHeaderCell
          header="View"
          isTableTooltip={false}
          sx={{paddingLeft: 3}}
        />
      );
    case "myDeposit":
      return (
        <GeneralTableHeaderCell header="My Deposit" isTableTooltip={false} />
      );
    case "status":
      return <GeneralTableHeaderCell header="Status" isTableTooltip={false} />;
    default:
      return assertNever(column);
  }
}

const DelegationValidatorCells = Object.freeze({
  addr: ValidatorAddrCell,
  status: StatusCell,
  operatorAddr: OperatorAddrCell,
  commission: CommissionCell,
  delegator: DelegatorCell,
  rewardsEarned: RewardsEarnedCell,
  delegatedAmount: DelegatedAmountCell,
  myDeposit: MyDepositCell,
  view: ViewCell,
});

type Column = keyof typeof DelegationValidatorCells;

const DEFAULT_COLUMNS: Column[] = [
  "view",
  "addr",
  "status",
  "operatorAddr",
  "delegatedAmount",
  "commission",
  "delegator",
  "rewardsEarned",
  "myDeposit",
];

const COLUMNS_WITHOUT_WALLET_CONNECTION: Column[] = [
  "view",
  "addr",
  "status",
  "operatorAddr",
  "delegatedAmount",
  "commission",
  "delegator",
  "rewardsEarned",
];

type ValidatorRowProps = {
  validator: ValidatorData;
  columns: Column[];
  connected: boolean;
};

type ValidatorCellProps = {
  validator: ValidatorData;
  delegatedStakeAmount: string | undefined;
  networkPercentage?: string;
  commission: number | undefined;
  connected: boolean;
};

function StatusCell({validator}: ValidatorCellProps) {
  return (
    <GeneralTableCell>
      <ValidatorStatusIcon address={validator.owner_address} />
    </GeneralTableCell>
  );
}
function CommissionCell({commission}: ValidatorCellProps) {
  return (
    <GeneralTableCell sx={{paddingRight: 10, textAlign: "right"}}>
      {commission && `${commission}%`}
    </GeneralTableCell>
  );
}

function DelegatorCell({validator}: ValidatorCellProps) {
  const {delegatorBalance} = useGetNumberOfDelegators(validator.owner_address);
  return (
    <GeneralTableCell sx={{paddingRight: 15, textAlign: "right"}}>
      {delegatorBalance}
    </GeneralTableCell>
  );
}

function RewardsEarnedCell({validator, connected}: ValidatorCellProps) {
  return (
    <GeneralTableCell
      sx={
        connected
          ? {paddingRight: 10, textAlign: "right"}
          : {textAlign: "right"}
      }
    >
      <APTCurrencyValue
        amount={Number(validator.apt_rewards_distributed).toFixed(2)}
        decimals={0}
      />
    </GeneralTableCell>
  );
}

function DelegatedAmountCell({
  delegatedStakeAmount,
  networkPercentage,
}: ValidatorCellProps) {
  return (
    <GeneralTableCell>
      <Box>
        <APTCurrencyValue
          amount={delegatedStakeAmount ?? ""}
          fixedDecimalPlaces={0}
        />
      </Box>
      <Box sx={{fontSize: 11, color: grey[450]}}>{networkPercentage}%</Box>
    </GeneralTableCell>
  );
}

function ViewCell() {
  return (
    <GeneralTableCell>
      <Button
        sx={{
          backgroundColor: aptosColor,
          "&:hover": {
            backgroundColor: alpha(primary["500"], 1),
          },
          width: "5px",
        }}
      >
        <VisibilityOutlinedIcon sx={{color: "black"}} />
      </Button>
    </GeneralTableCell>
  );
}

function MyDepositCell({validator}: ValidatorCellProps) {
  const [totalDeposit, setTotalDeposit] = useState<Types.MoveValue>();
  const {account} = useWallet();
  const {stakes} = useGetDelegatorStakeInfo(
    account?.address!,
    validator.owner_address,
  );

  useMemo(() => {
    setTotalDeposit(
      stakes.reduce(
        (prev, current) =>
          (current =
            Number(current) + (prev && Number(prev) !== 0 ? Number(prev) : 0)),
        0,
      ),
    );
  }, [stakes, account]);

  return (
    <GeneralTableCell sx={{paddingRight: 5, textAlign: "right"}}>
      {Number(totalDeposit) !== 0 ? (
        <Stack direction="row" spacing={1.5}>
          <CheckCircleIcon sx={{color: aptosColor}} fontSize="small" />
          <CurrencyValue
            amount={Number(totalDeposit).toString()}
            currencyCode="APT"
            fixedDecimalPlaces={0}
          />
        </Stack>
      ) : (
        <Stack textAlign="center">
          <Typography>N/A</Typography>
        </Stack>
      )}
    </GeneralTableCell>
  );
}

function ValidatorRow({validator, columns, connected}: ValidatorRowProps) {
  const navigate = useNavigate();
  const rowClick = (address: Types.Address) => {
    navigate(`/validator/${address}`);
  };

  const {commission, delegatedStakeAmount, networkPercentage} =
    useGetDelegationNodeInfo({
      validatorAddress: validator.owner_address,
    });

  return (
    <GeneralTableRow onClick={() => rowClick(validator.owner_address)}>
      {columns.map((column) => {
        const Cell = DelegationValidatorCells[column];
        return (
          <Cell
            key={column}
            validator={validator}
            commission={commission}
            delegatedStakeAmount={delegatedStakeAmount}
            networkPercentage={networkPercentage}
            connected={connected}
          />
        );
      })}
    </GeneralTableRow>
  );
}

export function DelegationValidatorsTable() {
  const [state, _] = useGlobalState();
  const {validators} = useGetValidators(state.network_name);
  const {connected} = useWallet();
  const columns = connected
    ? DEFAULT_COLUMNS
    : COLUMNS_WITHOUT_WALLET_CONNECTION;
  const [sortColumn, setSortColumn] = useState<Column>("rewardsEarned");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const sortedValidators = getSortedValidators(
    validators,
    sortColumn,
    sortDirection,
  );
  const [delegationValidators, setDelegationValidators] = useState<
    ValidatorData[]
  >([]);
  const {delegatedStakingPools, loading} =
    useGetDelegatedStakingPoolList() ?? [];

  useEffect(() => {
    if (!loading) {
      // delegated staking pools that are in validators list, meaning that they are either active or once active now inactive
      const validatorsInDelegatedStakingPools: ValidatorData[] =
        sortedValidators.filter((validator) => {
          return delegatedStakingPools.some(
            (pool) => pool.staking_pool_address === validator.owner_address,
          );
        });

      // delegated staking pools that are not in validators list, meaning that they were never active
      const delegatedStakingPoolsNotInValidators: ValidatorData[] =
        delegatedStakingPools
          .filter((pool) => {
            return !sortedValidators.some(
              (validator) =>
                validator.owner_address === pool.staking_pool_address,
            );
          })
          .map((pool) => ({
            owner_address: pool.staking_pool_address,
            operator_address: pool.current_staking_pool.operator_address,
            voting_power: "0",
            governance_voting_record: "",
            last_epoch: 0,
            last_epoch_performance: "",
            liveness: 0,
            rewards_growth: 0,
            apt_rewards_distributed: 0,
          }));
      setDelegationValidators([
        ...validatorsInDelegatedStakingPools,
        ...delegatedStakingPoolsNotInValidators,
      ]);
    }
  }, [validators, state.network_value, loading]);

  return (
    <Table>
      <TableHead>
        <TableRow sx={{verticalAlign: "bottom"}}>
          {columns.map((column) => (
            <ValidatorHeaderCell
              key={column}
              column={column}
              direction={sortColumn === column ? sortDirection : undefined}
              setDirection={setSortDirection}
              setSortColumn={setSortColumn}
              connected={connected}
            />
          ))}
        </TableRow>
      </TableHead>
      <GeneralTableBody>
        {delegationValidators.map((validator: any, i: number) => {
          return (
            <ValidatorRow
              key={i}
              validator={validator}
              columns={columns}
              connected={connected}
            />
          );
        })}
      </GeneralTableBody>
    </Table>
  );
}
