import {
	Button,
	ButtonGroup,
	Container,
	Flex,
	FormControl,
	FormHelperText,
	FormLabel,
	Heading,
	useToast,
	NumberInput,
	NumberInputField,
	Select,
} from '@chakra-ui/react';
import React, { useEffect, useRef, useState } from 'react';
import AlertDialogue from '../components/AlertDialogue';
import { FocusableElement } from '@chakra-ui/utils';
import { useLogin } from '../context/LoginContext';
import { useRouter } from 'next/router';
import Loading from 'react-loading';
import { useAccounts } from '../context/AccountContext';
import axiosConfig from '../config/axiosConfig';
import { encryptValue } from '../utils/security';
import { useCustomer } from '../context/CustomerContext';
import {
	accountSelectedValidation,
	amountValidation,
} from '../utils/validation';
import SEO from '../components/SEO';

export default function Deposit() {
	const [accountSelectedIndex, setAccountSelectedIndex] = useState<number>(-1);
	const [amount, setAmount] = useState<number>(0);
	const [loading, setLoading] = useState<boolean>(false);

	const [isOpen, setIsOpen] = React.useState(false);
	const cancelRef = useRef<FocusableElement>();

	const { isLoggedIn } = useLogin();
	const router = useRouter();
	const { accounts } = useAccounts();
	const { customer } = useCustomer();

	const toast = useToast();
	const toastIdRef = useRef<string | undefined | number>();

	useEffect(() => {
		if (!isLoggedIn) router.push('/login');
	}, [isLoggedIn]);

	if (!isLoggedIn) return <Loading />;

	function addToToast(
		title: string,
		description?: string,
		status?: string
	): void {
		toastIdRef.current = toast({
			title,
			description,
			duration: 5000,
			isClosable: true,
			position: 'top',
			status: status === 'success' ? 'success' : 'error',
		});
	}

	function alertCloseHandler() {
		setIsOpen(false);
	}

	async function alertContinueHandler() {
		try {
			setLoading(true);
			setIsOpen(false);

			const negativeMultiplier = await encryptValue(
				amount * -1,
				accounts[accountSelectedIndex].publicKey
			);

			const value = await encryptValue(
				amount,
				accounts[accountSelectedIndex].publicKey
			);

			await axiosConfig.post(
				'transactions/withdraw',
				{
					senderAccount: accounts[accountSelectedIndex as number].accountNumber,
					amount: value,
					negativeMultiplier,
				},
				{ headers: { Authorization: `Token ${customer?.token}` } }
			);

			addToToast('Amount Withdrew', `Amount: ${amount}`, 'success');
		} catch (e) {
			console.log(e);
			addToToast('Internal Server Error', 'Please try again later');
		} finally {
			setLoading(false);
			router.push('/dashboard');
		}
	}

	function withdrawButtonHandler() {
		try {
			accountSelectedValidation(accountSelectedIndex);
			amountValidation(amount);
			setIsOpen(true);
		} catch (e) {
			addToToast(e.message);
		}
	}

	return (
		<>
			<SEO title='Withdraw' />
			<Flex
				bg='twitter.50'
				alignItems='center'
				justifyContent='center'
				height='100vh'
			>
				<Container
					bg='gray.900'
					boxShadow='dark-lg'
					padding='5'
					borderRadius='10px'
					margin='5%'
				>
					<Heading color='twitter.50' textAlign='center'>
						Withdraw
					</Heading>
					<FormControl id='accountNumber' isRequired my='5'>
						<FormLabel color='twitter.50'>Account Number</FormLabel>
						<Select
							placeholder='Select Account'
							bg='twitter.50'
							onChange={e => {
								setAccountSelectedIndex(+e.target.value);
							}}
						>
							{accounts.map((account, index) => (
								<option key={index} value={index}>
									{account.accountNumber}
								</option>
							))}
						</Select>
					</FormControl>
					<FormControl id='amount' isRequired my='5'>
						<FormLabel color='twitter.50'>Amount</FormLabel>
						<NumberInput min={0} keepWithinRange={true}>
							<NumberInputField
								color='twitter.50'
								placeholder='Enter the amount that you would like to deposit'
								value={amount}
								onChange={e => setAmount(+e.target.value)}
							/>
						</NumberInput>
						<FormHelperText color='twitter.50'>Amount in INR</FormHelperText>
					</FormControl>
					<ButtonGroup width='100%' justifyContent='center'>
						<Button
							isLoading={loading}
							loadingText='Processing Transaction'
							colorScheme='blue'
							mx='2'
							onClick={withdrawButtonHandler}
						>
							Withdraw
						</Button>
						<Button
							colorScheme='red'
							mx='2'
							onClick={() => router.push('/dashboard')}
						>
							Reset
						</Button>
					</ButtonGroup>
				</Container>
				<AlertDialogue
					heading='Are you sure about this?'
					body={`You can't undo this action afterwards.`}
					isOpen={isOpen}
					onContinue={alertContinueHandler}
					onClose={alertCloseHandler}
					cancelRef={cancelRef}
				/>
			</Flex>
		</>
	);
}
