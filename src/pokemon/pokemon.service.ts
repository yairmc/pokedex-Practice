import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { PaginationDto } from 'src/common/dto/PaginationDto.dto';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { Pokemon } from './entities/pokemon.entity';

@Injectable()
export class PokemonService {
  private defaultLimit:number;
  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configServices: ConfigService,
  ) {
    this.defaultLimit=configServices.get<number>('defaultLimit')
  }


  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLowerCase();

    try {
      return await this.pokemonModel.create(createPokemonDto);
    } catch (error) {
      this.controlError(error);
    }
  }

  findAll(paginationDto: PaginationDto) {
    const { limit =this.defaultLimit, offset = 0 } = paginationDto;
    return this.pokemonModel.find().limit(limit).skip(offset);
  }

  async findOne(term: string) {
    let pokemon: Pokemon;

    if (!isNaN(+term)) pokemon = await this.pokemonModel.findOne({ no: term });

    //MongoId
    if (!pokemon && isValidObjectId(term))
      pokemon = await this.pokemonModel.findById(term);

    //Name
    if (!pokemon) pokemon = await this.pokemonModel.findOne({ name: term });

    if (!pokemon)
      throw new NotFoundException(
        `Pokemon with id, name or no "${term}" not found`,
      );

    return pokemon;
  }

  async update(term: string, updatePokemonDto: UpdatePokemonDto) {
    const pokemon = await this.findOne(term);

    try {
      if (updatePokemonDto.name)
        updatePokemonDto.name = updatePokemonDto.name.toLocaleLowerCase();
      await pokemon.updateOne(updatePokemonDto);

      return { ...pokemon.toJSON(), ...updatePokemonDto };
    } catch (error) {
      this.controlError(error);
    }
  }

  async remove(id: string) {
    const { deletedCount, acknowledged } = await this.pokemonModel.deleteOne({
      _id: id,
    });

    if (deletedCount === 0)
      throw new BadRequestException(`Pokemon with id "${id}" not found`);

    return;
  }

  controlError(error: any) {
    if (error.code === 11000)
      throw new BadRequestException(
        `Pokemon exist in db ${JSON.stringify(error.keyValue)}`,
      );
    console.log(error);
    throw new InternalServerErrorException(
      `Can't create Pokemon - Check server logs`,
    );
  }
}
